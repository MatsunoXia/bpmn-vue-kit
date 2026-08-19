/**
 * BPMN Vue Kit - 校验引擎
 *
 * 多层校验：
 * 1. 流程结构校验（开始/结束节点、连通性等）
 * 2. Schema 属性校验（必填、类型、自定义规则）
 * 3. 业务规则校验（外部注册）
 */

import { BPMN_TYPES, VALIDATION_LEVEL, VALIDATION_TYPE } from './constants.js'

/**
 * 校验结果结构
 * {
 *   elementId: string,
 *   elementType: string,
 *   elementName: string,
 *   field: string | null,
 *   level: 'error' | 'warning',
 *   type: 'structure' | 'property' | 'business',
 *   message: string,
 *   code: string,
 * }
 */

export class Validator {
  constructor(schemaManager, dataManager, eventManager) {
    this._schema = schemaManager
    this._data = dataManager
    this._events = eventManager
    // 外部注册的自定义校验器
    this._customValidators = []
  }

  /**
   * 注册自定义业务校验器
   * @param {Function} fn - (dataManager, schemaManager) => ValidationResult[]
   */
  addValidator(fn) {
    this._customValidators.push(fn)
  }

  /**
   * 执行全部校验
   * @param {Object} bpmnElements - bpmn.js 的 elementRegistry.getAll()
   * @returns {ValidationResult[]}
   */
  validateAll(bpmnElements) {
    this._events.emit('validation.start')

    const results = []

    // 1. 结构校验
    results.push(...this._validateStructure(bpmnElements))

    // 2. Schema 属性校验
    for (const element of bpmnElements) {
      results.push(...this._validateProperties(element))
    }

    // 3. 自定义业务校验
    for (const fn of this._customValidators) {
      try {
        const customResults = fn(this._data, this._schema)
        if (Array.isArray(customResults)) {
          results.push(...customResults)
        }
      } catch (e) {
        console.error('[Validator] Custom validator error:', e)
      }
    }

    this._events.emit('validation.end', results)
    return results
  }

  /**
   * 校验单个元素
   */
  validateElement(element) {
    const results = []
    results.push(...this._validateProperties(element))
    return results
  }

  /**
   * 流程结构校验
   */
  _validateStructure(elements) {
    const results = []
    const startEvents = []
    const endEvents = []
    const tasks = []
    const gateways = []
    const flows = []

    for (const el of elements) {
      const type = el.type || el.businessObject?.$type
      if (type === BPMN_TYPES.START_EVENT) startEvents.push(el)
      else if (type === BPMN_TYPES.END_EVENT) endEvents.push(el)
      else if (type?.includes('Task')) tasks.push(el)
      else if (type?.includes('Gateway')) gateways.push(el)
      else if (type === BPMN_TYPES.SEQUENCE_FLOW) flows.push(el)
    }

    // 必须有开始节点
    if (startEvents.length === 0) {
      results.push(this._makeResult({
        elementId: 'process',
        elementType: BPMN_TYPES.PROCESS,
        elementName: '流程',
        level: VALIDATION_LEVEL.ERROR,
        type: VALIDATION_TYPE.STRUCTURE,
        message: '流程缺少开始节点',
        code: 'STRUCT_NO_START',
      }))
    }

    // 必须有结束节点
    if (endEvents.length === 0) {
      results.push(this._makeResult({
        elementId: 'process',
        elementType: BPMN_TYPES.PROCESS,
        elementName: '流程',
        level: VALIDATION_LEVEL.ERROR,
        type: VALIDATION_TYPE.STRUCTURE,
        message: '流程缺少结束节点',
        code: 'STRUCT_NO_END',
      }))
    }

    // 检查是否有孤立节点（无连线连接）
    const connectedIds = new Set()
    for (const flow of flows) {
      const bo = flow.businessObject
      if (bo?.sourceRef) connectedIds.add(bo.sourceRef.id || bo.sourceRef)
      if (bo?.targetRef) connectedIds.add(bo.targetRef.id || bo.targetRef)
    }
    for (const el of [...tasks, ...gateways]) {
      if (!connectedIds.has(el.id)) {
        results.push(this._makeResult({
          elementId: el.id,
          elementType: el.type,
          elementName: el.businessObject?.name || el.id,
          level: VALIDATION_LEVEL.WARNING,
          type: VALIDATION_TYPE.STRUCTURE,
          message: `节点 "${el.businessObject?.name || el.id}" 未连接任何连线`,
          code: 'STRUCT_ORPHAN',
        }))
      }
    }

    // 网关检查：排他网关出线 >= 2
    for (const gw of gateways) {
      const type = gw.type || gw.businessObject?.$type
      if (type === BPMN_TYPES.EXCLUSIVE_GATEWAY) {
        const outFlows = flows.filter(f => {
          const bo = f.businessObject
          const sourceId = bo?.sourceRef?.id || bo?.sourceRef
          return sourceId === gw.id
        })
        if (outFlows.length < 2) {
          results.push(this._makeResult({
            elementId: gw.id,
            elementType: gw.type,
            elementName: gw.businessObject?.name || '排他网关',
            level: VALIDATION_LEVEL.WARNING,
            type: VALIDATION_TYPE.STRUCTURE,
            message: `排他网关 "${gw.businessObject?.name || gw.id}" 出线少于2条`,
            code: 'STRUCT_GATEWAY_FEW_OUT',
          }))
        }
      }
    }

    return results
  }

  /**
   * Schema 属性校验
   */
  _validateProperties(element) {
    const results = []
    const bpmnType = element.type || element.businessObject?.$type
    if (!bpmnType) return results

    const schema = this._schema.getSchema(bpmnType)
    if (!schema) return results

    const elementId = element.id
    const elementName = element.businessObject?.name || elementId
    // BPMN 数据直接来自 bpmn.js element。
    // DataManager 只负责业务数据。
    const bpmnData = {
      id: element.id,
      name: element.businessObject?.name || '',
    }

    const businessData = this._data.getBusinessData(elementId) || {}

    for (const prop of schema.properties) {
      // 检查可见性条件
      if (prop.visibleWhen) {
        const checkData = prop.target === 'bpmn' ? bpmnData : businessData
        if (!this._evaluateCondition(checkData, prop.visibleWhen)) {
          continue // 不可见，跳过校验
        }
      }

      // 获取字段值
      const value = prop.target === 'bpmn' ? bpmnData[prop.key] : businessData[prop.key]

      // 必填校验
      if (prop.required) {
        if (value === undefined || value === null || value === '') {
          results.push(this._makeResult({
            elementId,
            elementType: bpmnType,
            elementName,
            field: prop.key,
            level: VALIDATION_LEVEL.ERROR,
            type: VALIDATION_TYPE.PROPERTY,
            message: `"${prop.label}" 不能为空`,
            code: 'PROP_REQUIRED',
          }))
          continue // 必填都没过，后面的规则不用校验了
        }
      }

      // 自定义校验规则
      if (prop.rules && prop.rules.length > 0 && value !== undefined && value !== null) {
        for (const rule of prop.rules) {
          if (typeof rule.validator === 'function') {
            const valid = rule.validator(value, bpmnData, businessData)
            if (!valid) {
              results.push(this._makeResult({
                elementId,
                elementType: bpmnType,
                elementName,
                field: prop.key,
                level: rule.level || VALIDATION_LEVEL.ERROR,
                type: VALIDATION_TYPE.PROPERTY,
                message: rule.message || `"${prop.label}" 校验失败`,
                code: rule.code || 'PROP_CUSTOM',
              }))
            }
          }
        }
      }
    }

    return results
  }

  /**
   * 评估条件表达式
   * 条件格式: { field, op, value }
   */
  _evaluateCondition(data, condition) {
    if (!condition || !condition.field) return true
    const fieldValue = data[condition.field]
    const { op, value } = condition

    switch (op) {
      case '==': return fieldValue == value
      case '===': return fieldValue === value
      case '!=': return fieldValue != value
      case '>': return fieldValue > value
      case '<': return fieldValue < value
      case '>=': return fieldValue >= value
      case '<=': return fieldValue <= value
      case 'in': return Array.isArray(value) && value.includes(fieldValue)
      case 'notEmpty': return fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
      default: return true
    }
  }

  _makeResult({ elementId, elementType, elementName, field, level, type, message, code }) {
    return { elementId, elementType, elementName, field: field || null, level, type, message, code }
  }
}
