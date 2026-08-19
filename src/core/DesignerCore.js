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
import { SchemaManager } from './SchemaManager.js'
import { DataManager } from './DataManager.js'
import { Validator } from './Validator.js'
import { ComponentRegistry } from './ComponentRegistry.js'
import { PluginManager } from './PluginManager.js'
import { BPMN_TYPES } from './constants.js'

import locale from '../locale.js'

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

export class DesignerCore {

  constructor(options = {}) {
    this._container = options.container

    this._ready = false

    this._readonly =
      options.readonly || false

    this._initialXml =
      options.bpmnXml || null

    this._initialBusinessData =
      options.businessData || null

    this.events = new EventManager()

    this.schema =
      new SchemaManager(
        options.customSchemas || {}
      )

    this.data =
      new DataManager(this.events)

    this.validator =
      new Validator(
        this.schema,
        this.data,
        this.events
      )

    this.componentRegistry =
      new ComponentRegistry()

    this.pluginManager =
      new PluginManager()

    this._modeler = null

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
        contextPadProvider: [
          'value',
          '',
        ],

        labelEditingProvider: [
          'value',
          '',
        ],

        bendpoints: [
          'value',
          '',
        ],
      })
    }

    this._modeler =
      new BpmnModeler({
        container:
          this._container,

        additionalModules,
      })

    this._bridgeEvents()

    const xml =
      this._initialXml ||
      DEFAULT_BPMN_XML

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
    return this._readonly
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

        this.data.removeElement(
          element.id
        )

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

        this.data.removeElement(
          connection.id
        )

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

    if (existing) {
      return existing
    }

    const bpmnType =
      element.type ||
      element.businessObject?.$type

    const initialData =
      this.schema.getDefaultData(
        bpmnType
      )

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

    if (
      Object.keys(existing).length > 0
    ) {
      return existing
    }

    const initialData =
      this.schema.getDefaultData(
        BPMN_TYPES.PROCESS
      )

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

    if (!this._modeler) {
      return null
    }

    return this._modeler
      .get('canvas')
      .getRootElement() || null
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

    /*
     * XML 是一份新的 BPMN 模型。
     *
     * 所以旧业务数据不能继续残留。
     */
    this.data.clear()

    this._selectedElement =
      null

    const result =
      await this._modeler.importXML(xml)

    this._syncElements()

    this._syncBusinessDataIntegrity()

    this.events.emit(
      EVENTS.XML_IMPORTED
    )

    return result
  }

  async exportXml() {

    const result =
      await this._modeler.saveXML({
        format: true,
      })

    this.events.emit(
      EVENTS.XML_EXPORTED
    )

    return result.xml
  }

  async exportSvg() {

    return (
      await this._modeler.saveSVG()
    ).svg
  }

  /**
   * 导出完整业务数据快照。
   *
   * 不包含 BPMN 模型字段。
   */
  exportAllData() {
    return this.data.exportAll()
  }

  /**
   * 导出给业务系统使用的数据。
   *
   * 这里把：
   *
   * BPMN Model
   * +
   * BusinessData
   *
   * 组合起来。
   */
  exportBusinessData() {

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

  // ==================== BPMN 属性 ====================

  updateElementProperties(
    elementId,
    properties
  ) {

    const modeling =
      this._modeler.get(
        'modeling'
      )

    const el =
      this._modeler
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
    this._modeler
      .get('commandStack')
      .undo()
  }

  redo() {
    this._modeler
      .get('commandStack')
      .redo()
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
    }
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