/**
 * BPMN Vue Kit - 设计器核心
 *
 * 数据职责：
 *
 * bpmn.js
 *   ↓
 * 唯一负责 BPMN 模型
 *
 * DataManager
 *   ↓
 * 唯一负责业务数据
 *
 * DesignerCore
 *   ↓
 * 负责两者之间的生命周期协调以及导出组合
 */

import BpmnModeler from 'bpmn-js/lib/Modeler'

import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'

import { EventManager, EVENTS } from './EventManager.js'
import { SchemaManager } from '../schema/index.js'
import { DataManager } from '../data/index.js'
import { Validator, PropertyValidator, ProcessValidator } from '../validation/index.js'
import { ComponentRegistry } from '../component/index.js'
import { PluginManager } from '../plugin/index.js'
import { BPMN_TYPES } from '../shared/constants.js'
import { ModeManager } from './ModeManager.js'
import { BpmnModel, BpmnSerializer } from '../bpmn/index.js'
import { SchemaMatcher } from '../schema/index.js'
import { DataSerializer } from '../data/index.js'

import locale from '../bpmn/locale.js'

const TYPE_SHORT_MAP = {
  'bpmn:StartEvent': 'startEvent',
  'bpmn:EndEvent': 'endEvent',
  'bpmn:UserTask': 'userTask',
  'bpmn:ServiceTask': 'serviceTask',
  'bpmn:ExclusiveGateway': 'exclusiveGateway',
  'bpmn:ParallelGateway': 'parallelGateway',
  'bpmn:SequenceFlow': 'sequenceFlow',
  'bpmn:Process': 'process',
}

function shortType(bpmnType) {
  return TYPE_SHORT_MAP[bpmnType]
    || bpmnType?.replace('bpmn:', '')
    || 'unknown'
}

const DEFAULT_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="开始" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

class ElementDataCommandHandler {
  execute(context) {
    const dataManager = context.dataManager
    const firstExecution = !context.initialized
    const target = context.target || 'business'

    if (firstExecution) {
      context.previous = context.elementId === 'process'
        ? (target === 'component'
            ? dataManager.getProcessComponentData()
            : dataManager.getProcessData())
        : (target === 'component'
            ? dataManager.getComponentData(context.elementId) || {}
            : dataManager.getBusinessData(context.elementId) || {})
      context.initialized = true
    }

    if (
      firstExecution &&
      context.elementId !== 'process' &&
      context.conditionExpression !== undefined
    ) {
      const element = context.modeler
        ?.get('elementRegistry')
        .get(context.elementId)

      if (element) {
        context.previousCondition =
          element.businessObject?.conditionExpression

        const expression = String(context.conditionExpression).trim()
        element.businessObject.conditionExpression = expression
          ? context.modeler.get('moddle').create('bpmn:FormalExpression', {
              body: expression,
            })
          : undefined
      }
    }

    if (context.elementId === 'process') {
      if (target === 'component') {
        dataManager.setProcessComponentData(context.data)
      } else {
        dataManager.setProcessData(context.data)
      }
    } else if (target === 'component') {
      dataManager.setComponentData(context.elementId, context.data)
    } else {
      dataManager.setBusinessData(context.elementId, context.data)
    }
  }

  revert(context) {
    if (context.elementId === 'process') {
      if (context.target === 'component') {
        context.dataManager.setProcessComponentData(context.previous)
      } else {
        context.dataManager.setProcessData(context.previous)
      }
    } else if (context.target === 'component') {
      context.dataManager.setComponentData(
        context.elementId,
        context.previous
      )
    } else {
      context.dataManager.setBusinessData(
        context.elementId,
        context.previous
      )

      if (
        context.conditionExpression !== undefined
      ) {
        const element = context.modeler
          ?.get('elementRegistry')
          .get(context.elementId)

        if (element) {
          element.businessObject.conditionExpression =
            context.previousCondition
        }
      }
    }
  }
}

export class DesignerCore {

  constructor(options = {}) {
    this._container = options.container

    this._ready = false

    this._readonly =
      options.readonly || false

    this.modeManager =
      new ModeManager(
        this._readonly ? 'readonly' : 'design'
      )

    this._initialXml =
      options.bpmnXml || null

    this._initialBusinessData =
      options.businessData || null

    this.events = new EventManager()

    this.schema =
      new SchemaManager(
        options.customSchemas || {}
      )

    this.schemaMatcher =
      new SchemaMatcher(this.schema)

    this.data =
      new DataManager(this.events)

    this.dataSerializer =
      new DataSerializer(this.data)

    this.validator =
      new Validator(
        this.schema,
        this.data,
        this.events
      )

    this.propertyValidator =
      new PropertyValidator(this.validator)

    this.processValidator =
      new ProcessValidator(this.validator)

    this.componentRegistry =
      new ComponentRegistry()

    this.pluginManager =
      new PluginManager()

    this._modeler = null

    this.bpmn = null

    this.bpmnSerializer = null

    this._selectedElement = null

    this._readonlyKeydownHandler = null
  }

  // ==================== 初始化 ====================

  async init() {

    const additionalModules = [
      locale,
    ]

    if (this._readonly) {

      additionalModules.push({
        // 禁用滚轮滚动
        zoomScroll: ["value", ""],
        // 禁止拖动线
        bendpoints: ["value", ""],
        // 禁用左侧面板
        paletteProvider: ["value", ""],
        // 禁止点击节点出现contextPad
        contextPadProvider: ["value", ""],
        // 禁止双击节点出现label编辑框
        labelEditingProvider: ["value", ""],
        // 禁用单个图形拖动
        move: ['value', '']
      })
    }

    this._modeler = new BpmnModeler({
        container: this._container,
        additionalModules,
      })

    this.bpmn = new BpmnModel(this._modeler)

    this.bpmnSerializer = new BpmnSerializer(this._modeler)

    this._modeler .get('commandStack')
                  .registerHandler('business.data.update', ElementDataCommandHandler)
    this._bridgeEvents()

    const xml = this._initialXml || DEFAULT_BPMN_XML
    await this._modeler.importXML(xml)

    /*
     * BPMN 模型加载完成后：
     *
     * BPMN Model
     *     ↓
     * 初始化 BusinessData 默认值
     */
    this._syncElements()

    /*
     * 再使用外部业务数据覆盖默认值。
     */
    if (this._initialBusinessData) {

      this.data.importAll(
        this._initialBusinessData
      )

      this._syncBusinessDataIntegrity()
    }

    if (this._readonly) {
      this._applyReadonly()
    }

    this._ready = true

    this.events.emit(
      EVENTS.READY
    )

    return this
  }

  // ==================== 插件 ====================

  use(plugin, options = {}) {

    const context = {
      componentRegistry:
        this.componentRegistry,

      schemaManager:
        this.schema,

      dataManager:
        this.data,

      validator:
        this.validator,

      eventManager:
        this.events,

      designerCore:
        this,
    }

    this.pluginManager.install(
      plugin,
      context,
      options
    )

    return this
  }

  // ==================== Readonly ====================

  isReadonly() {
    return this.modeManager.isReadonly()
  }

  _applyReadonly() {

    if (!this._modeler) return

    const eventBus =
      this._modeler.get(
        'eventBus'
      )

    const blockDrag = (e) => {

      if (e.originEvent) {
        e.originEvent
          .stopPropagation()
      }

      return false
    }

    eventBus.on(
      'drag.init',
      blockDrag,
      {
        priority: 10000,
      }
    )

    this._readonlyKeydownHandler =
      (e) => {

        if (
          e.key === 'Delete' ||
          e.key === 'Backspace'
        ) {

          e.stopPropagation()
          e.preventDefault()
        }
      }

    this._container.addEventListener(
      'keydown',
      this._readonlyKeydownHandler,
      {
        capture: true,
      }
    )
  }

  // ==================== BPMN / Business 数据桥接 ====================

  _bridgeEvents() {

    const eventBus =
      this._modeler.get(
        'eventBus'
      )

    /*
     * 选择元素
     */
    eventBus.on(
      'selection.changed',
      (e) => {

        const element =
          e.newSelection?.[0] ||
          null

        this._selectedElement =
          element

        if (element) {

          this._ensureElementBusinessData(
            element
          )

          this.events.emit(
            EVENTS.ELEMENT_SELECTED,
            {
              id: element.id,

              type:
                element.type ||
                element.businessObject?.$type,

              name:
                element.businessObject?.name ||
                '',

              element,
            }
          )

        } else {

          const process =
            this.getProcessElement()

          this.events.emit(
            EVENTS.ELEMENT_SELECTED,
            {
              id: 'process',

              type:
                BPMN_TYPES.PROCESS,

              name:
                process?.businessObject?.name ||
                '',

              element: null,
            }
          )
        }
      }
    )

    /*
     * 创建 Shape
     */
    eventBus.on(
      'commandStack.shape.create.postExecute',
      (e) => {

        const element =
          e.context?.shape

        if (!element) return

        this._ensureElementBusinessData(
          element
        )

        this.events.emit(
          EVENTS.ELEMENT_CREATED,
          {
            id: element.id,
            type: element.type,
            element,
          }
        )
      }
    )

    /*
     * 删除 Shape
     */
    eventBus.on(
      'commandStack.shape.delete.postExecute',
      (e) => {

        const element =
          e.context?.shape

        if (!element) return

        this.events.emit(
          EVENTS.ELEMENT_REMOVED,
          {
            id: element.id,
            type: element.type,
          }
        )
      }
    )

    /*
     * 创建 SequenceFlow
     */
    eventBus.on(
      'commandStack.connection.create.postExecute',
      (e) => {

        const connection =
          e.context?.connection

        if (!connection) return

        this._ensureElementBusinessData(
          connection
        )

        this.events.emit(
          EVENTS.ELEMENT_CREATED,
          {
            id: connection.id,
            type: connection.type,
            element: connection,
          }
        )
      }
    )

    /*
     * 删除 SequenceFlow
     */
    eventBus.on(
      'commandStack.connection.delete.postExecute',
      (e) => {

        const connection =
          e.context?.connection

        if (!connection) return

        this.events.emit(
          EVENTS.ELEMENT_REMOVED,
          {
            id: connection.id,
            type: connection.type,
          }
        )
      }
    )

    /*
     * BPMN 属性变化
     *
     * 注意：
     * 这里不再同步 DataManager。
     *
     * name 已经直接存在 bpmn.js 中。
     */
    eventBus.on(
      'commandStack.element.updateProperties.postExecute',
      (e) => {

        const element =
          e.context?.element

        if (!element) return

        const properties =
          e.context?.properties || {}

        this.events.emit(
          EVENTS.ELEMENT_CHANGED,
          {
            id: element.id,
            properties,
            element,
          }
        )
      }
    )

    /*
     * commandStack 变化后的最终一致性校正。
     */
    eventBus.on(
      'commandStack.changed',
      () => {

        setTimeout(() => {

          this._syncElements()

          this._syncBusinessDataIntegrity()

          this.events.emit(
            EVENTS.PROCESS_CHANGED
          )

        }, 0)
      }
    )
  }

  // ==================== BusinessData 初始化 ====================

  _ensureElementBusinessData(
    element
  ) {

    if (!element?.id) {
      return null
    }

    const existing =
      this.data.getBusinessData(
        element.id
      )

    const bpmnType =
      element.type ||
      element.businessObject?.$type

    const initialData =
      this.schema.getDefaultData(
        bpmnType
      )

    if (existing) {
      const merged = {
        ...initialData,
        ...existing,
      }

      if (JSON.stringify(merged) !== JSON.stringify(existing)) {
        this.data.setBusinessData(
          element.id,
          merged
        )
      }

      return merged
    }

    return this.data.initElement(
      element,
      initialData
    )
  }

  _ensureProcessBusinessData() {

    const process =
      this.getProcessElement()

    if (!process) {
      return null
    }

    const existing =
      this.data.getProcessData()

    const initialData =
      this.schema.getDefaultData(
        BPMN_TYPES.PROCESS
      )

    if (Object.keys(existing).length > 0) {
      const merged = {
        ...initialData,
        ...existing,
      }

      if (JSON.stringify(merged) !== JSON.stringify(existing)) {
        this.data.setProcessData(merged)
      }

      return merged
    }

    return this.data.initProcess(
      initialData
    )
  }

  // ==================== 数据同步 ====================

  /**
   * 将 BPMN 模型中的元素同步到 BusinessData。
   *
   * 只同步：
   *
   * “这个元素是否存在”
   *
   * 不复制：
   *
   * type
   * name
   * id
   * source
   * target
   */
  _syncElements() {

    if (!this._modeler) return

    const elementRegistry =
      this._modeler.get(
        'elementRegistry'
      )

    for (
      const el of elementRegistry.getAll()
    ) {

      const type =
        el.type ||
        el.businessObject?.$type

      if (
        !type ||
        type.startsWith('bpmndi:')
      ) {
        continue
      }

      if (
        type === BPMN_TYPES.PROCESS
      ) {
        continue
      }

      this._ensureElementBusinessData(
        el
      )
    }

    this._ensureProcessBusinessData()
  }

  /**
   * 删除 BPMN 模型中不存在的业务数据。
   */
  _syncBusinessDataIntegrity() {

    if (!this._modeler) return

    const elementRegistry =
      this._modeler.get(
        'elementRegistry'
      )

    const validIds =
      new Set()

    for (
      const el of elementRegistry.getAll()
    ) {

      const type =
        el.type ||
        el.businessObject?.$type

      if (
        !type ||
        type.startsWith('bpmndi:')
      ) {
        continue
      }

      if (
        type === BPMN_TYPES.PROCESS
      ) {
        continue
      }

      validIds.add(el.id)
    }

    this.data.removeElementsNotIn(
      validIds
    )
  }

  // ==================== BPMN 查询 ====================

  getProcessElement() {
    return this.bpmn?.getProcess() || null
  }

  getSelectedElement() {
    return this._selectedElement
  }

  getModeler() {
    return this._modeler
  }

  // ==================== 创建元素 ====================

  createElement(
    type,
    position
  ) {

    if (this.isReadonly()) {
      return false
    }

    const factory =
      this._modeler.get(
        'elementFactory'
      )

    const create =
      this._modeler.get(
        'create'
      )

    const shape =
      factory.createShape({
        type,

        businessObject: {
          $type: type,
          id: this._generateId(type),
          name: '',
        },
      })

    create.start({
      shape,
      position,
    })
  }

  _generateId(type) {

    const prefix =
      type.replace(
        'bpmn:',
        ''
      )

    const registry =
      this._modeler.get(
        'elementRegistry'
      )

    let idx = 1

    let id =
      `${prefix}_${idx}`

    while (registry.get(id)) {

      idx++

      id =
        `${prefix}_${idx}`
    }

    return id
  }

  // ==================== Import / Export ====================

  async importXml(xml) {

    if (this.isReadonly()) {
      return false
    }

    this._selectedElement =
      null

    const result =
      await this.bpmnSerializer.importXml(xml)

    /*
     * XML 是一份新的 BPMN 模型。
     * 只有导入成功后才清理旧业务数据，避免失败时丢失当前配置。
     */
    this.data.clear()

    this._syncElements()

    this._syncBusinessDataIntegrity()

    this.events.emit(
      EVENTS.XML_IMPORTED
    )

    return result
  }

  async exportXml() {

    const xml =
      await this.bpmnSerializer.exportXml()

    this.events.emit(
      EVENTS.XML_EXPORTED
    )

    return xml
  }

  async exportSvg() {
    return this.bpmnSerializer.exportSvg()
  }

  /**
   * 导出完整流程定义快照。
   */
  exportAllData() {
    return this.exportDefinition()
  }

  /**
   * 导出完整流程定义。
   * XML 仍是 BPMN 结构的标准存储，JSON 快照用于业务系统快速读取。
   */
  exportDefinition() {
    const processElement = this.getProcessElement()
    const processBusinessData = this.data.getProcessData()
    const elements = {}
    const relations = []

    for (const element of this.bpmn?.getBpmnElements() || []) {
      const type = this.bpmn.getType(element)

      if (type === BPMN_TYPES.PROCESS) continue

      const business = this.data.getBusinessData(element.id) || {}
      const source = element.businessObject?.sourceRef
      const target = element.businessObject?.targetRef

      elements[element.id] = {
        bpmn: {
          id: element.id,
          type,
          name: element.businessObject?.name || '',
        },
        business: { ...business },
      }

      if (type === BPMN_TYPES.SEQUENCE_FLOW) {
        relations.push({
          id: element.id,
          source: source?.id || source || null,
          target: target?.id || target || null,
        })
      }
    }

    return {
      version: '1.0',
      process: {
        bpmn: {
          id: processElement?.id || '',
          type: BPMN_TYPES.PROCESS,
          name: processElement?.businessObject?.name || '',
        },
        business: { ...processBusinessData },
      },
      elements,
      relations,
    }
  }

  /**
   * 导入完整业务快照。BPMN XML 仍通过 importXml 单独导入。
   */
  importDefinition(definition, options = {}) {
    if (
      this.isReadonly() ||
      !definition ||
      typeof definition !== 'object'
    ) {
      return false
    }

    if (definition.xml) {
      const importResult = this.importXml(definition.xml)

      return importResult.then(() => this.importAllData({
          process: definition.process?.business || {},
          elements: Object.fromEntries(
            Object.entries(definition.elements || {}).map(([id, item]) => [
              id,
              item.business || {},
            ])
          ),
        }), options)
    }

    return this.importAllData({
      process: definition.process?.business || definition.process || {},
      elements: Object.fromEntries(
        Object.entries(definition.elements || {}).map(([id, item]) => [
          id,
          item.business || item,
        ])
      ),
    }, options)
  }

  /**
   * 导出纯业务数据。
   */
  exportBusinessData() {
    return this.dataSerializer.export()
  }

  /**
   * 导出包含 BPMN type/name 的组合业务视图。
   * 该接口用于兼容旧版本的 nodes 格式；结构化快照请使用 exportDefinition。
   *
   * 这里把：
   *
   * BPMN Model
   * +
   * BusinessData
   *
   * 组合起来。
   */
  exportWorkflowData() {

    const processElement =
      this.getProcessElement()

    const processBusinessData =
      this.data.getProcessData()

    const process = {
      ...processBusinessData,
    }

    const nodes = {}

    const elementRegistry =
      this._modeler.get(
        'elementRegistry'
      )

    for (
      const element of elementRegistry.getAll()
    ) {

      const type =
        element.type ||
        element.businessObject?.$type

      if (
        !type ||
        type.startsWith('bpmndi:')
      ) {
        continue
      }

      if (
        type === BPMN_TYPES.PROCESS
      ) {
        continue
      }

      const businessData =
        this.data.getBusinessData(
          element.id
        ) || {}

      const isFlow =
        type === BPMN_TYPES.SEQUENCE_FLOW

      const hasBusinessData =
        Object.keys(
          businessData
        ).length > 0

      /*
       * 普通没有业务数据的 SequenceFlow
       * 不需要输出。
       */
      if (
        isFlow &&
        !hasBusinessData
      ) {
        continue
      }

      nodes[element.id] = {
        type: shortType(type),

        name:
          element.businessObject?.name ||
          '',

        ...businessData,
      }
    }

    if (processElement) {
      process.name =
        processElement
          .businessObject?.name || ''
    }

    return {
      process,
      nodes,
    }
  }

  /**
   * 导入业务数据。
   *
   * 默认 merge。
   */
  importAllData(
    data,
    options = {}
  ) {

    if (this.isReadonly()) {
      return false
    }

    if (options.replace) {

      /*
       * 替换业务数据时：
       *
       * 1. 清空旧数据
       * 2. 根据当前 BPMN + Schema
       *    重新生成默认值
       * 3. 导入业务数据覆盖默认值
       */
      this.data.clear()

      this._syncElements()

      this.data.importAll(
        data,
        {
          replace: false,
        }
      )

    } else {

      this.data.importAll(
        data,
        options
      )

      this._syncElements()
    }

    this._syncBusinessDataIntegrity()
  }

  /**
   * 获取元素的统一扩展数据视图。
   * BPMN 原生数据仍直接读取 bpmn.js，不复制进 DataManager。
   */
  getElementData(elementId) {
    if (!elementId) return null

    if (elementId === 'process') {
      const process = this.getProcessElement()
      return {
        bpmn: {
          id: process?.id || '',
          type: process?.type || BPMN_TYPES.PROCESS,
          name: process?.businessObject?.name || '',
        },
        component: this.data.getProcessComponentData(),
        business: this.data.getProcessData(),
      }
    }

    const element = this._modeler?.get('elementRegistry').get(elementId)
    if (!element) return null

    return {
      bpmn: {
        id: element.id,
        type: element.type || element.businessObject?.$type || '',
        name: element.businessObject?.name || '',
      },
      component: this.data.getComponentData(elementId) || {},
      business: this.data.getBusinessData(elementId) || {},
    }
  }

  /**
   * 统一更新入口。
   * target=bpmn 进入 bpmn.js；component/business 进入 DataManager。
   */
  updateElementData(elementId, target, data = {}, options = {}) {
    if (this.isReadonly() || !elementId) return false

    if (target === 'bpmn') {
      return this.updateElementProperties(elementId, data)
    }

    if (target === 'component') {
      return this.setElementComponentData(elementId, data)
    }

    if (target === 'business') {
      return elementId === 'process'
        ? this.setProcessBusinessData(data)
        : this.setElementBusinessData(elementId, data, options)
    }

    return false
  }

  /**
   * 通过统一命令栈替换元素组件数据。
   */
  setElementComponentData(elementId, data = {}) {
    if (this.isReadonly() || !elementId || !this._modeler) return false

    this._modeler
      .get('commandStack')
      .execute('business.data.update', {
        dataManager: this.data,
        modeler: this._modeler,
        elementId,
        target: 'component',
        data: { ...data },
      })

    return true
  }

  /**
   * 通过统一命令栈替换元素业务数据。
   */
  setElementBusinessData(elementId, data = {}, options = {}) {
    if (this.isReadonly() || !elementId || !this._modeler) {
      return false
    }

    this._modeler
      .get('commandStack')
      .execute('business.data.update', {
        dataManager: this.data,
        modeler: this._modeler,
        elementId,
        target: 'business',
        data: { ...data },
        conditionExpression: options.conditionExpression,
      })

    return true
  }

  /**
   * 通过统一命令栈替换流程业务数据。
   */
  setProcessBusinessData(data = {}) {
    if (this.isReadonly() || !this._modeler) {
      return false
    }

    this._modeler
      .get('commandStack')
      .execute('business.data.update', {
        dataManager: this.data,
        elementId: 'process',
        target: 'business',
        data: { ...data },
      })

    return true
  }

  // ==================== 校验 ====================

  validate() {

    const elements =
      this._modeler
        .get('elementRegistry')
        .getAll()
        .filter(el => {

          const type =
            el.type ||
            el.businessObject?.$type

          return (
            type &&
            !type.startsWith('bpmndi:')
          )
        })

    return this.validator
      .validateAll(elements)
  }

  validateProcess() {
    return this.processValidator.validate(this._getBpmnElements())
  }

  validateProperties() {
    return this.propertyValidator.validate(this._getBpmnElements())
  }

  _getBpmnElements() {
    return this.bpmn?.getBpmnElements() || []
  }

  // ==================== BPMN 属性 ====================
  updateElementProperties(
    elementId,
    properties
  ) {

    if (this.isReadonly()) {
      return false
    }

    const modeling =
      this._modeler.get(
        'modeling'
      )

    const el = elementId === 'process'
      ? this.getProcessElement()
      : this._modeler
          .get('elementRegistry')
          .get(elementId)

    if (!el) {
      return false
    }

    const bpmnProps = {}

    /*
     * 当前阶段只有 name
     * 作为可编辑 BPMN 属性。
     */
    if (
      properties.name !== undefined
    ) {
      bpmnProps.name =
        properties.name
    }

    if (
      Object.keys(bpmnProps).length > 0
    ) {

      modeling.updateProperties(
        el,
        bpmnProps
      )
    }

    return true
  }

  /**
   * 更新顺序流的 BPMN 条件表达式。
   */
  updateSequenceFlowCondition(elementId, expression = '') {
    if (this.isReadonly()) {
      return false
    }

    const element =
      this._modeler
        .get('elementRegistry')
        .get(elementId)

    if (!element || element.type !== BPMN_TYPES.SEQUENCE_FLOW) {
      return false
    }

    const moddle = this._modeler.get('moddle')
    const conditionExpression = String(expression).trim()
      ? moddle.create('bpmn:FormalExpression', {
          body: String(expression),
        })
      : undefined

    this._modeler
      .get('modeling')
      .updateProperties(element, { conditionExpression })

    return true
  }

  // ==================== Canvas ====================

  zoomIn() {

    const canvas =
      this._modeler.get(
        'canvas'
      )

    canvas.zoom(
      canvas.zoom() * 1.2,
      'center'
    )
  }

  zoomOut() {

    const canvas =
      this._modeler.get(
        'canvas'
      )

    canvas.zoom(
      canvas.zoom() * 0.8,
      'center'
    )
  }

  zoomFit() {

    this._modeler
      .get('canvas')
      .zoom('fit-viewport')
  }

  zoomReset() {

    this._modeler
      .get('canvas')
      .zoom(
        1.0,
        {
          x: 0,
          y: 0,
        }
      )
  }

  // ==================== Undo / Redo ====================

  undo() {
    if (this.isReadonly()) return false

    this._modeler
      .get('commandStack')
      .undo()

    return true
  }

  redo() {
    if (this.isReadonly()) return false

    this._modeler
      .get('commandStack')
      .redo()

    return true
  }

  canUndo() {
    return this._modeler
      .get('commandStack')
      .canUndo()
  }

  canRedo() {
    return this._modeler
      .get('commandStack')
      .canRedo()
  }

  deleteSelected() {

    if (this.isReadonly()) {
      return false
    }

    const selected =
      this._modeler
        .get('selection')
        .get()

    if (
      selected.length > 0
    ) {

      this._modeler
        .get('modeling')
        .removeElements(
          selected
        )

      return true
    }

    return false
  }

  // ==================== Destroy ====================

  destroy() {

    if (
      this._readonlyKeydownHandler &&
      this._container
    ) {

      this._container.removeEventListener(
        'keydown',
        this._readonlyKeydownHandler,
        {
          capture: true,
        }
      )

      this._readonlyKeydownHandler =
        null
    }

    if (this._modeler) {

      this._modeler.destroy()

      this._modeler = null
    }

    this._ready = false

    this.events.clear()

    this.data.clear()

    this.pluginManager.clear()

    this.componentRegistry.clear()
  }
}

export {
  DEFAULT_BPMN_XML,
}