/**
 * BPMN Vue Kit - 常量定义
 */

// 支持的 BPMN 元素类型
export const BPMN_TYPES = {
  START_EVENT: 'bpmn:StartEvent',
  END_EVENT: 'bpmn:EndEvent',
  USER_TASK: 'bpmn:UserTask',
  SERVICE_TASK: 'bpmn:ServiceTask',
  EXCLUSIVE_GATEWAY: 'bpmn:ExclusiveGateway',
  PARALLEL_GATEWAY: 'bpmn:ParallelGateway',
  SEQUENCE_FLOW: 'bpmn:SequenceFlow',
  PROCESS: 'bpmn:Process',
}

// 元素分类
export const ELEMENT_CATEGORIES = {
  EVENT: 'event',
  TASK: 'task',
  GATEWAY: 'gateway',
  FLOW: 'flow',
  PROCESS: 'process',
}

// 获取元素分类
export function getCategory(bpmnType) {
  if (!bpmnType) return null
  if (bpmnType.includes('Event')) return ELEMENT_CATEGORIES.EVENT
  if (bpmnType.includes('Task')) return ELEMENT_CATEGORIES.TASK
  if (bpmnType.includes('Gateway')) return ELEMENT_CATEGORIES.GATEWAY
  if (bpmnType.includes('SequenceFlow')) return ELEMENT_CATEGORIES.FLOW
  if (bpmnType.includes('Process')) return ELEMENT_CATEGORIES.PROCESS
  return null
}

// 属性面板控件类型
export const WIDGET_TYPES = {
  INPUT: 'input',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  SWITCH: 'switch',
  CONDITION: 'condition',
}

// 数据目标
export const DATA_TARGET = {
  BPMN: 'bpmn',
  COMPONENT: 'component',
  BUSINESS: 'business',
}

// 校验级别
export const VALIDATION_LEVEL = {
  ERROR: 'error',
  WARNING: 'warning',
}

// 校验类型
export const VALIDATION_TYPE = {
  STRUCTURE: 'structure',
  PROPERTY: 'property',
  BUSINESS: 'business',
}
