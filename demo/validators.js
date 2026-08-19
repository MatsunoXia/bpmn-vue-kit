/**
 * 自定义业务校验器示例
 *
 * 校验器是一个函数，接收 dataManager 和 schemaManager，
 * 返回校验结果数组。
 *
 * 每个结果格式：
 * {
 *   elementId: 'Activity_1',       // 元素 ID
 *   elementType: 'bpmn:UserTask',  // 元素类型
 *   elementName: '部门审批',        // 元素名称（用于展示）
 *   field: 'assignee',             // 字段名（可选，定位到具体字段）
 *   level: 'error',                // 'error' 或 'warning'
 *   type: 'business',              // 校验类型
 *   message: '审批人不能为空',      // 错误信息
 *   code: 'BIZ_NO_ASSIGNEE',       // 错误码
 * }
 */
export function approvalValidator(dataManager, schemaManager) {
  const results = []
  const allData = dataManager.exportBusinessData()

  // 校验规则：流程必须关联表单
  if (!allData.process?.formId) {
    results.push({
      elementId: 'process',
      elementType: 'bpmn:Process',
      elementName: allData.process?.name || '流程',
      field: 'formId',
      level: 'warning',
      type: 'business',
      message: '建议为流程关联一个表单',
      code: 'BIZ_NO_FORM',
    })
  }

  return results
}
