/**
 * BPMN Vue Kit - 自定义组件注册中心
 *
 * 业务系统可以注册自己的属性组件（如 UserSelect、RoleSelect 等），
 * Schema 中 type 匹配时自动渲染对应的自定义组件。
 *
 * 用法：
 *   registry.register('user-select', UserSelectComponent)
 *
 * Schema 中：
 *   { key: 'assignee', type: 'user-select', ... }
 *
 * PropertyPanel 渲染时，先查注册中心，有自定义组件就用自定义的，否则用内置的。
 */

export class ComponentRegistry {
  constructor() {
    // Map<string, VueComponent>
    this._components = new Map()
    // 内置组件类型（不允许覆盖）
    this._builtinTypes = new Set(['input', 'textarea', 'number', 'select', 'radio', 'checkbox', 'switch'])
  }

  /**
   * 注册自定义组件
   * @param {string} type - 组件类型名（对应 Schema 中的 type）
   * @param {Object} component - Vue 组件
   */
  register(type, component) {
    if (this._builtinTypes.has(type)) {
      console.warn(`[ComponentRegistry] "${type}" is a built-in type, cannot be overridden.`)
      return
    }
    this._components.set(type, component)
  }

  /**
   * 批量注册
   * @param {Object} components - { 'user-select': CompA, 'role-select': CompB }
   */
  registerAll(components) {
    for (const [type, comp] of Object.entries(components)) {
      this.register(type, comp)
    }
  }

  /**
   * 注销自定义组件
   */
  unregister(type) {
    this._components.delete(type)
  }

  /**
   * 获取组件
   * @returns {Object|null} Vue 组件或 null（表示使用内置组件）
   */
  get(type) {
    return this._components.get(type) || null
  }

  /**
   * 是否是自定义组件类型
   */
  has(type) {
    return this._components.has(type)
  }

  /**
   * 是否是内置类型
   */
  isBuiltin(type) {
    return this._builtinTypes.has(type)
  }

  /**
   * 获取所有已注册的自定义组件类型
   */
  getRegisteredTypes() {
    return Array.from(this._components.keys())
  }

  /**
   * 清空
   */
  clear() {
    this._components.clear()
  }
}
