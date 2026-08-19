/**
 * bpmn.js 模型访问适配层。
 * 负责模型查询和基础操作，业务数据由 DesignerCore/DataManager 管理。
 */
export class BpmnModel {
  constructor(modeler) {
    this.modeler = modeler
  }

  get registry() {
    return this.modeler.get('elementRegistry')
  }

  get elements() {
    return this.registry.getAll()
  }

  getElement(id) {
    return this.registry.get(id) || null
  }

  getProcess() {
    return this.modeler.get('canvas').getRootElement() || null
  }

  getType(element) {
    return element?.type || element?.businessObject?.$type || null
  }

  isDiagramElement(element) {
    return this.getType(element)?.startsWith('bpmndi:') || false
  }

  getBpmnElements() {
    return this.elements.filter(element => {
      const type = this.getType(element)
      return type && !type.startsWith('bpmndi:')
    })
  }
}
