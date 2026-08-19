/**
 * Core：设计器运行时编排层。
 * 这里仅暴露生命周期、事件和模式管理，不再混入数据、Schema、组件注册等领域实现。
 */
export { DesignerCore, DEFAULT_BPMN_XML } from './DesignerCore.js'
export { EventManager, EVENTS } from './EventManager.js'
export { ModeManager } from './ModeManager.js'
