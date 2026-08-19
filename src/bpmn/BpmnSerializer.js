/**
 * BPMN XML 序列化适配层。
 */
export class BpmnSerializer {
  constructor(modeler) {
    this.modeler = modeler
  }

  async importXml(xml) {
    return this.modeler.importXML(xml)
  }

  async exportXml() {
    const result = await this.modeler.saveXML({ format: true })
    return result.xml
  }

  async exportSvg() {
    const result = await this.modeler.saveSVG()
    return result.svg
  }
}
