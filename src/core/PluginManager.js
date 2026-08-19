/**
 * BPMN Vue Kit - 插件管理器
 *
 * 插件是一个对象，包含 install 方法：
 * {
 *   name: 'my-plugin',
 *   install(context) {
 *     context.componentRegistry.register('user-select', MyUserSelect)
 *     context.schemaManager.addProperties('bpmn:UserTask', [...])
 *     context.validator.addValidator(fn)
 *   }
 * }
 *
 * context 包含：
 * - componentRegistry: 组件注册中心
 * - schemaManager: Schema 管理器
 * - dataManager: 数据管理器
 * - validator: 校验引擎
 * - eventManager: 事件管理器
 * - designerCore: DesignerCore 实例
 */

export class PluginManager {
  constructor() {
    this._plugins = new Map()
  }

  /**
   * 安装插件
   * @param {Object} plugin - { name, install }
   * @param {Object} context - 核心模块引用
   * @param {Object} [options] - 插件配置
   */
  install(plugin, context, options = {}) {
    if (!plugin || !plugin.name) {
      console.error('[PluginManager] Plugin must have a name.')
      return
    }
    if (this._plugins.has(plugin.name)) {
      console.warn(`[PluginManager] Plugin "${plugin.name}" is already installed.`)
      return
    }

    if (typeof plugin.install === 'function') {
      plugin.install(context, options)
    }

    this._plugins.set(plugin.name, { plugin, options })
  }

  /**
   * 卸载插件
   */
  uninstall(pluginName) {
    const entry = this._plugins.get(pluginName)
    if (entry && typeof entry.plugin.uninstall === 'function') {
      entry.plugin.uninstall()
    }
    this._plugins.delete(pluginName)
  }

  /**
   * 获取已安装插件
   */
  get(pluginName) {
    const entry = this._plugins.get(pluginName)
    return entry ? entry.plugin : null
  }

  /**
   * 是否已安装
   */
  has(pluginName) {
    return this._plugins.has(pluginName)
  }

  /**
   * 获取所有已安装插件名
   */
  getInstalled() {
    return Array.from(this._plugins.keys())
  }

  /**
   * 清空
   */
  clear() {
    this._plugins.clear()
  }
}
