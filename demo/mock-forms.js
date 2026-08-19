/**
 * 模拟表单数据
 *
 * 实际业务中，表单数据通常从后端接口获取。
 * 这里提供几个示例表单，每个表单包含字段列表，
 * 供条件表达式编辑器使用。
 *
 * 字段格式：{ key, label }
 * key:   字段标识（存储在数据库中的字段名）
 * label: 字段显示名称
 */
export default [
  {
    id: 'leave_form',
    name: '请假申请',
    value: 'leave_form',
    label: '请假申请',
    fields: [
      { key: 'leaveType', label: '请假类型' },
      { key: 'days', label: '请假天数' },
      { key: 'reason', label: '请假原因' },
      { key: 'startDate', label: '开始日期' },
      { key: 'endDate', label: '结束日期' },
    ],
  },
  {
    id: 'expense_form',
    name: '报销申请',
    value: 'expense_form',
    label: '报销申请',
    fields: [
      { key: 'amount', label: '金额' },
      { key: 'category', label: '费用类别' },
      { key: 'department', label: '所属部门' },
      { key: 'invoiceCount', label: '发票数量' },
      { key: 'description', label: '费用说明' },
    ],
  },
  {
    id: 'purchase_form',
    name: '采购申请',
    value: 'purchase_form',
    label: '采购申请',
    fields: [
      { key: 'itemName', label: '物品名称' },
      { key: 'quantity', label: '采购数量' },
      { key: 'unitPrice', label: '单价' },
      { key: 'totalPrice', label: '总价' },
      { key: 'supplier', label: '供应商' },
      { key: 'urgency', label: '紧急程度' },
    ],
  },
]
