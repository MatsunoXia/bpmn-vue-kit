/**
 * BPMN Vue Kit - Schema 管理器
 *
 * Schema 只描述"元素应该有什么属性，以及怎么编辑"
 * 不保存用户填写的业务数据
 *
 * 一个属性 Schema 示例：
 * {
 *   key: 'assignee',
 *   label: '处理人',
 *   type: 'input',
 *   required: true,
 *   group: '审批配置',
 *   target: 'business',
 *   placeholder: '请输入处理人',
 *   defaultValue: '',
 *   visibleWhen: { field: 'assigneeType', op: '==', value: 'person' },
 *   rules: [{ validator: (val) => val.length > 0, message: '处理人不能为空' }]
 * }
 */

import { BPMN_TYPES, WIDGET_TYPES, DATA_TARGET, ELEMENT_CATEGORIES, getCategory } from '../shared/constants.js'
import { setPathValue } from '../engine/ConditionEngine.js'

/**
 * 默认 Schema 定义
 * 覆盖 MVP 支持的所有 BPMN 元素
 */
const DEFAULT_SCHEMAS = {
  // ===== 流程级别 =====
  [BPMN_TYPES.PROCESS]: {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
      { key: 'advanced', label: '高级设置', order: 1 },
    ],
    properties: [
      { key: 'id', label: '流程ID', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', readonly: true },
      { key: 'name', label: '流程名称', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', required: true, placeholder: '请输入流程名称' },
      { key: 'description', label: '流程描述', type: WIDGET_TYPES.TEXTAREA, target: DATA_TARGET.BUSINESS, group: 'basic', placeholder: '请输入流程描述' },
      { key: 'formId', label: '关联表单', type: WIDGET_TYPES.SELECT, target: DATA_TARGET.BUSINESS, group: 'basic', placeholder: '请选择流程表单', options: [] },
      { key: 'version', label: '版本号', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BUSINESS, group: 'advanced', defaultValue: '1.0' },
      { key: 'category', label: '流程分类', type: WIDGET_TYPES.SELECT, target: DATA_TARGET.BUSINESS, group: 'advanced', options: [
        { label: '审批流程', value: 'approval' },
        { label: '业务流程', value: 'business' },
        { label: '通知流程', value: 'notification' },
      ]},
    ],
  },

  // ===== 开始事件 =====
  [BPMN_TYPES.START_EVENT]: {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
    ],
    properties: [
      { key: 'id', label: '节点ID', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', readonly: true },
      { key: 'name', label: '节点名称', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', placeholder: '开始' },
    ],
  },

  // ===== 结束事件 =====
  [BPMN_TYPES.END_EVENT]: {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
    ],
    properties: [
      { key: 'id', label: '节点ID', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', readonly: true },
      { key: 'name', label: '节点名称', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', placeholder: '结束' },
    ],
  },

  // ===== 用户任务 =====
  [BPMN_TYPES.USER_TASK]: {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
      { key: 'approval', label: '审批配置', order: 1 },
      { key: 'form', label: '表单配置', order: 2 },
    ],
    properties: [
      { key: 'id', label: '节点ID', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', readonly: true },
      { key: 'name', label: '节点名称', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', required: true, placeholder: '请输入节点名称' },
      { key: 'assigneeType', label: '处理人类型', type: WIDGET_TYPES.SELECT, target: DATA_TARGET.BUSINESS, group: 'approval', required: true, defaultValue: 'person', options: [
        { label: '指定人员', value: 'person' },
        { label: '指定角色', value: 'role' },
        { label: '部门主管', value: 'dept_manager' },
        { label: '发起人自选', value: 'self_select' },
      ]},
      { key: 'assignee', label: '处理人', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BUSINESS, group: 'approval', required: true, placeholder: '请输入处理人', visibleWhen: { field: 'assigneeType', op: '==', value: 'person' } },
      { key: 'role', label: '处理角色', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BUSINESS, group: 'approval', required: true, placeholder: '请输入角色', visibleWhen: { field: 'assigneeType', op: '==', value: 'role' } },
      { key: 'allowReject', label: '允许驳回', type: WIDGET_TYPES.SWITCH, target: DATA_TARGET.BUSINESS, group: 'approval', defaultValue: true },
      { key: 'allowTransfer', label: '允许转交', type: WIDGET_TYPES.SWITCH, target: DATA_TARGET.BUSINESS, group: 'approval', defaultValue: false },
      { key: 'formKey', label: '关联表单', type: WIDGET_TYPES.SELECT, target: DATA_TARGET.BUSINESS, group: 'form', options: [] },
    ],
  },

  // ===== 服务任务 =====
  [BPMN_TYPES.SERVICE_TASK]: {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
      { key: 'config', label: '服务配置', order: 1 },
    ],
    properties: [
      { key: 'id', label: '节点ID', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', readonly: true },
      { key: 'name', label: '节点名称', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', required: true, placeholder: '请输入节点名称' },
      { key: 'serviceType', label: '服务类型', type: WIDGET_TYPES.SELECT, target: DATA_TARGET.BUSINESS, group: 'config', required: true, options: [
        { label: 'HTTP请求', value: 'http' },
        { label: 'JavaDelegate', value: 'java' },
        { label: '消息发送', value: 'message' },
      ]},
      { key: 'serviceUrl', label: '服务地址', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BUSINESS, group: 'config', placeholder: '请输入URL', visibleWhen: { field: 'serviceType', op: '==', value: 'http' } },
      { key: 'javaClass', label: 'Java类名', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BUSINESS, group: 'config', placeholder: 'com.example.MyDelegate', visibleWhen: { field: 'serviceType', op: '==', value: 'java' } },
    ],
  },

  // ===== 排他网关 =====
  [BPMN_TYPES.EXCLUSIVE_GATEWAY]: {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
    ],
    properties: [
      { key: 'id', label: '节点ID', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', readonly: true },
      { key: 'name', label: '节点名称', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', placeholder: '排他网关' },
    ],
  },

  // ===== 并行网关 =====
  [BPMN_TYPES.PARALLEL_GATEWAY]: {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
    ],
    properties: [
      { key: 'id', label: '节点ID', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', readonly: true },
      { key: 'name', label: '节点名称', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', placeholder: '并行网关' },
    ],
  },

  // ===== 顺序流 =====
  [BPMN_TYPES.SEQUENCE_FLOW]: {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
      { key: 'condition', label: '条件配置', order: 1 },
    ],
    properties: [
      { key: 'id', label: '连线ID', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', readonly: true },
      { key: 'name', label: '连线名称', type: WIDGET_TYPES.INPUT, target: DATA_TARGET.BPMN, group: 'basic', placeholder: '连线名称' },
      { key: 'conditions', label: '条件表达式', type: 'condition', target: DATA_TARGET.BUSINESS, group: 'condition' },
    ],
  },
}

export class SchemaManager {
  constructor(customSchemas = {}) {
    this._schemas = new Map()
    // 加载默认 schema
    this._loadDefaults()
    // 加载自定义 schema（会覆盖默认的）
    if (customSchemas && Object.keys(customSchemas).length > 0) {
      this.registerSchemas(customSchemas)
    }
  }

  _loadDefaults() {
    for (const [type, schema] of Object.entries(DEFAULT_SCHEMAS)) {
      this._schemas.set(type, this._normalizeSchema(schema))
    }
  }

  /**
   * 注册/覆盖 Schema
   * @param {Object} schemas - { 'bpmn:UserTask': { groups: [...], properties: [...] } }
   */
  registerSchemas(schemas) {
    for (const [type, schema] of Object.entries(schemas)) {
      this._schemas.set(type, this._normalizeSchema(schema))
    }
  }

  /**
   * 为指定类型追加属性
   */
  addProperties(bpmnType, properties) {
    const existing = this._schemas.get(bpmnType)
    if (!existing) {
      this._schemas.set(bpmnType, this._normalizeSchema({ properties }))
      return
    }
    for (const prop of properties) {
      const normalized = this._normalizeProperty(prop)
      const idx = existing.properties.findIndex(p => p.key === normalized.key)
      if (idx >= 0) {
        existing.properties[idx] = normalized
      } else {
        existing.properties.push(normalized)
      }
    }
  }

  /**
   * 获取指定元素类型的 Schema
   */
  getSchema(bpmnType) {
    return this._schemas.get(bpmnType) || null
  }

  /**
   * 获取属性列表
   */
  getProperties(bpmnType) {
    const schema = this.getSchema(bpmnType)
    return schema ? schema.properties : []
  }

  /**
   * 获取分组列表（已排序）
   */
  getGroups(bpmnType) {
    const schema = this.getSchema(bpmnType)
    if (!schema) return []
    return [...schema.groups].sort((a, b) => a.order - b.order)
  }

  /**
   * 根据分组获取属性
   */
  getPropertiesByGroup(bpmnType, groupKey) {
    return this.getProperties(bpmnType).filter(p => p.group === groupKey)
  }

  /**
   * 标准化 Schema
   */
  _normalizeSchema(schema) {
    const groups = (schema.groups || [{ key: 'basic', label: '基础信息', order: 0 }]).map(g => ({
      key: g.key || 'basic',
      label: g.label || '基础信息',
      order: g.order ?? 0,
    }))
    const properties = (schema.properties || []).map(p => this._normalizeProperty(p))
    return { groups, properties }
  }

  /**
   * 标准化单个属性
   */
  _normalizeProperty(prop) {
    const component = prop.component || {}
    const data = prop.data || {}
    const validation = prop.validation || {}
    const visibility = prop.visibility || {}

    return {
      key: prop.key,
      label: prop.label || prop.key,
      type: component.type || prop.type || WIDGET_TYPES.INPUT,
      component: {
        type: component.type || prop.type || WIDGET_TYPES.INPUT,
        props: component.props || {},
      },
      target: data.target || prop.target || DATA_TARGET.BUSINESS,
      data: {
        target: data.target || prop.target || DATA_TARGET.BUSINESS,
        path: data.path || prop.path || prop.key,
      },
      group: prop.group || 'basic',
      required: validation.required ?? prop.required ?? false,
      readonly: prop.readonly ?? false,
      disabled: prop.disabled ?? false,
      placeholder: prop.placeholder || '',
      defaultValue: prop.defaultValue ?? undefined,
      options: prop.options || [],
      visibleWhen: visibility.when || prop.visibleWhen || null,
      rules: validation.rules || prop.rules || [],
    }
  }

  /**
   * 获取属性的数据目标。
   * 第二阶段统一从 data.target 读取，兼容旧的 target 写法。
   */
  getPropertyTarget(prop) {
    return prop?.data?.target || prop?.target || DATA_TARGET.BUSINESS
  }

  /**
   * 获取属性的数据路径。
   */
  getPropertyPath(prop) {
    return prop?.data?.path || prop?.path || prop?.key
  }

  /**
   * 应用默认值到数据
   * @param {string} bpmnType
   * @param {Object} data - 现有数据
   * @returns {Object} 填充了默认值的数据
   */
  applyDefaults(bpmnType, data = {}) {
    const properties = this.getProperties(bpmnType)
    const result = { ...data }
    for (const prop of properties) {
      const path = prop.data?.path || prop.key
      if (
        prop.defaultValue !== undefined &&
        this._getPathValue(result, path) === undefined
      ) {
        Object.assign(
          result,
          setPathValue(result, path, prop.defaultValue)
        )
      }
    }
    return result
  }

  /**
   * 获取指定 BPMN 类型的新建业务数据。
   *
   * 这是 applyDefaults({},) 的语义化封装，
   * 供 DesignerCore 初始化元素时使用。
   */
  getDefaultData(bpmnType) {
    return this.applyDefaults(bpmnType, {})
  }

  _getPathValue(data, path) {
    return String(path || '')
      .split('.')
      .reduce((current, key) => current == null ? undefined : current[key], data)
  }
}
