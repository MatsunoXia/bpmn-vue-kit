/**
 * BPMN Vue Kit
 * Schema-driven BPMN Designer for Vue 3
 *
 * 公共入口按领域聚合，避免消费者依赖内部目录结构。
 */

// UI
export {
  BpmnDesigner,
  BpmnToolbar,
  BpmnPalette,
  PropertyPanel,
  ValidationPanel,
  ConditionEditor,
  ContextMenu,
} from './ui/index.js'

// Core / runtime
export {
  DesignerCore,
  DEFAULT_BPMN_XML,
  EventManager,
  EVENTS,
  ModeManager,
} from './core/index.js'

// BPMN adapter
export {
  BpmnModel,
  BpmnSerializer,
  BPMN_COMMAND_EVENTS,
} from './bpmn/index.js'

// Data
export {
  DataManager,
  DataSerializer,
} from './data/index.js'

// Schema
export {
  SchemaManager,
  SchemaMatcher,
} from './schema/index.js'

// Components / extensions
export {
  ComponentRegistry,
  normalizeComponentRegistration,
} from './component/index.js'

export { PluginManager } from './plugin/index.js'

// Validation
export {
  Validator,
  PropertyValidator,
  ProcessValidator,
} from './validation/index.js'

// Shared constants
export {
  BPMN_TYPES,
  ELEMENT_CATEGORIES,
  WIDGET_TYPES,
  DATA_TARGET,
  VALIDATION_LEVEL,
  VALIDATION_TYPE,
  getCategory,
} from './shared/constants.js'

// Condition engine
export {
  evaluateCondition,
  evaluateConditions,
  getPathValue,
  serializeCondition,
  serializeConditions,
  setPathValue,
} from './engine/ConditionEngine.js'
