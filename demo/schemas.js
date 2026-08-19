/**
 * 自定义 Schema 配置
 *
 * 每个 key 对应一个 BPMN 元素类型。
 * 未配置的类型使用库内置默认 Schema。
 *
 * 字段说明：
 *   key         - 属性键名（存储到 bpmn 或 business 数据中）
 *   label       - 显示名称
 *   type        - 控件类型：input / textarea / number / select / radio / checkbox / switch / condition
 *   target      - 数据目标：'bpmn'（流程结构）或 'business'（业务配置）
 *   group       - 所属分组的 key
 *   required    - 是否必填（校验时使用）
 *   readonly    - 是否只读
 *   placeholder - 占位文本
 *   defaultValue- 默认值
 *   options     - 选项列表（select/radio 用），格式：[{ label, value }]
 *   visibleWhen - 条件显示，格式：{ field, op, value }
 *   rules       - 自定义校验规则，格式：[{ validator, message, level }]
 */

// ===== 模拟表单数据 =====
// 实际业务中从后端接口获取，这里用假数据演示
import forms from './mock-forms.js'

export default {
  // ===== 流程级别 =====
  'bpmn:Process': {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
      { key: 'advanced', label: '高级设置', order: 1 },
    ],
    properties: [
      { key: 'id', label: '流程ID', type: 'input', target: 'bpmn', group: 'basic', readonly: true },
      { key: 'name', label: '流程名称', type: 'input', target: 'bpmn', group: 'basic', required: true, placeholder: '请输入流程名称' },
      { key: 'description', label: '流程描述', type: 'textarea', target: 'business', group: 'basic', placeholder: '请输入流程描述' },
      { key: 'formId', label: '关联表单', type: 'select', target: 'business', group: 'basic', placeholder: '请选择流程表单', options: forms },
      { key: 'version', label: '版本号', type: 'input', target: 'business', group: 'advanced', defaultValue: '1.0' },
      { key: 'category', label: '流程分类', type: 'select', target: 'business', group: 'advanced', options: [
        { label: '审批流程', value: 'approval' },
        { label: '业务流程', value: 'business' },
        { label: '通知流程', value: 'notification' },
      ]},
    ],
  },

  // ===== 用户任务 =====
  'bpmn:UserTask': {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
      { key: 'approval', label: '审批配置', order: 1 },
      { key: 'advanced', label: '高级设置', order: 2 },
    ],
    properties: [
      { key: 'id', label: '节点ID', type: 'input', target: 'bpmn', group: 'basic', readonly: true },
      { key: 'name', label: '节点名称', type: 'input', target: 'bpmn', group: 'basic', required: true, placeholder: '请输入节点名称' },
      { key: 'assigneeType', label: '处理人类型', type: 'select', target: 'business', group: 'approval', required: true, defaultValue: 'person', options: [
        { label: '指定人员', value: 'person' },
        { label: '指定角色', value: 'role' },
        { label: '部门主管', value: 'dept_manager' },
        { label: '发起人自选', value: 'self_select' },
      ]},
      { key: 'assignee', label: '处理人', type: 'input', target: 'business', group: 'approval', required: true, placeholder: '请输入处理人', visibleWhen: { field: 'assigneeType', op: '==', value: 'person' },
        // 字段级自定义校验规则
        rules: [
          { validator: (val) => val && val.length >= 2, message: '处理人姓名至少2个字符', level: 'error' },
        ]
      },
      { key: 'role', label: '处理角色', type: 'input', target: 'business', group: 'approval', required: true, placeholder: '请输入角色名称', visibleWhen: { field: 'assigneeType', op: '==', value: 'role' } },
      { key: 'allowReject', label: '允许驳回', type: 'switch', target: 'business', group: 'approval', defaultValue: true },
      { key: 'allowTransfer', label: '允许转交', type: 'switch', target: 'business', group: 'approval', defaultValue: false },
      { key: 'multiInstance', label: '会签模式', type: 'switch', target: 'business', group: 'advanced', defaultValue: false },
    ],
  },

  // ===== 排他网关 =====
  'bpmn:ExclusiveGateway': {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
    ],
    properties: [
      { key: 'id', label: '节点ID', type: 'input', target: 'bpmn', group: 'basic', readonly: true },
      { key: 'name', label: '节点名称', type: 'input', target: 'bpmn', group: 'basic', placeholder: '排他网关' },
      { key: 'defaultFlow', label: '默认分支ID', type: 'input', target: 'business', group: 'condition', placeholder: '输入默认分支的连线ID' },
    ],
  },

  // ===== 顺序流 =====
  'bpmn:SequenceFlow': {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
      { key: 'condition', label: '条件配置', order: 1 },
    ],
    properties: [
      { key: 'id', label: '连线ID', type: 'input', target: 'bpmn', group: 'basic', readonly: true },
      { key: 'name', label: '连线名称', type: 'input', target: 'bpmn', group: 'basic', placeholder: '连线名称' },
      { key: 'conditions', label: '条件表达式', type: 'condition', target: 'business', group: 'condition' },
    ],
  },
}
