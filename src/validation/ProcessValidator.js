/**
 * 流程结构校验职责入口。
 */
export class ProcessValidator {
  constructor(validator) {
    this.validator = validator
  }

  validate(elements) {
    return this.validator.validateProcess(elements)
  }
}
