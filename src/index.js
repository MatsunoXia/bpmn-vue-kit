/**
 * BPMN Vue Kit
 * Schema-driven BPMN Designer for Vue 3
 */

// Vue 组件
export { default as BpmnDesigner } from './components/BpmnDesigner.vue'
export { default as BpmnToolbar } from './components/BpmnToolbar.vue'
export { default as PropertyPanel } from './components/PropertyPanel.vue'
export { default as ValidationPanel } from './components/ValidationPanel.vue'
export { default as ConditionEditor } from './components/ConditionEditor.vue'
export { default as ContextMenu } from './components/ContextMenu.vue'

// Core 模块
export {
  DesignerCore,
  EventManager,
  EVENTS,
  SchemaManager,
  DataManager,
  Validator,
  ComponentRegistry,
  PluginManager,
  BPMN_TYPES,
  ELEMENT_CATEGORIES,
  WIDGET_TYPES,
  DATA_TARGET,
  VALIDATION_LEVEL,
  VALIDATION_TYPE,
  getCategory,
} from './core/index.js'
