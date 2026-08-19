/**
 * 示例插件：OA 审批流程扩展
 * 展示如何用插件扩展 Schema + 注册自定义组件
 */
import UserSelect from '../custom-components/UserSelect.vue'

export const OaApprovalPlugin = {
  name: 'oa-approval',

  install(context) {
    const { componentRegistry, schemaManager } = context

    // 注册自定义组件
    componentRegistry.register('user-select', UserSelect)

    // 为 UserTask 追加属性
    schemaManager.addProperties('bpmn:UserTask', [
      {
        key: 'approver',
        label: '审批人',
        type: 'user-select',
        target: 'business',
        group: 'approval',
        required: true,
        placeholder: '请选择审批人',
      },
      {
        key: 'dueDate',
        label: '审批期限(天)',
        type: 'number',
        target: 'business',
        group: 'approval',
        defaultValue: 3,
      },
    ])
  },
}
