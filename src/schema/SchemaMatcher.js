/**
 * Schema 匹配入口，统一处理元素对象和 BPMN 类型字符串。
 */
export class SchemaMatcher {
  constructor(schemaManager) {
    this.schemaManager = schemaManager
  }

  getType(elementOrType) {
    if (typeof elementOrType === 'string') return elementOrType
    return elementOrType?.type || elementOrType?.businessObject?.$type || null
  }

  getSchema(elementOrType) {
    return this.schemaManager.getSchema(this.getType(elementOrType))
  }

  getProperties(elementOrType) {
    return this.schemaManager.getProperties(this.getType(elementOrType))
  }
}
