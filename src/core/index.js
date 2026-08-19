/**
 * BPMN Vue Kit - Core Module
 * 框架无关的核心层
 */

export { DesignerCore, DEFAULT_BPMN_XML } from './DesignerCore.js'
export { EventManager, EVENTS } from './EventManager.js'
export { SchemaManager } from './SchemaManager.js'
export { DataManager } from './DataManager.js'
export { Validator } from './Validator.js'
export { ComponentRegistry } from './ComponentRegistry.js'
export { PluginManager } from './PluginManager.js'
export {
  BPMN_TYPES,
  ELEMENT_CATEGORIES,
  WIDGET_TYPES,
  DATA_TARGET,
  VALIDATION_LEVEL,
  VALIDATION_TYPE,
  getCategory,
} from './constants.js'
