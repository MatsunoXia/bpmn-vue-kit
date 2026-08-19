/**
 * bpmn.js 事件适配层的公共命名空间。
 * 具体事件绑定仍由 DesignerCore 统一协调，避免外部直接依赖 bpmn.js 事件名。
 */
export const BPMN_COMMAND_EVENTS = {
  SHAPE_CREATED: 'commandStack.shape.create.postExecute',
  SHAPE_DELETED: 'commandStack.shape.delete.postExecute',
  CONNECTION_CREATED: 'commandStack.connection.create.postExecute',
  CONNECTION_DELETED: 'commandStack.connection.delete.postExecute',
  PROPERTIES_UPDATED: 'commandStack.element.updateProperties.postExecute',
  COMMAND_STACK_CHANGED: 'commandStack.changed',
}
