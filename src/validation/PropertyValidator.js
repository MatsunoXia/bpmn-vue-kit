/**
 * 属性校验职责入口。
 * 当前实现委托给 Validator，保持旧 API 兼容并为后续拆包提供边界。
 */
export class PropertyValidator {
  constructor(validator) {
    this.validator = validator
  }

  validate(elements) {
    return this.validator.validateProperties(elements)
  }

  validateElement(element) {
    return this.validator.validateElement(element)
  }
}
