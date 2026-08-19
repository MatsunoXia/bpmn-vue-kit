/**
 * BPMN Vue Kit - 事件管理器
 * 统一事件系统，桥接 bpmn.js 事件和业务事件
 */
export class EventManager {
  constructor() {
    this._listeners = new Map()
  }

  /**
   * 监听事件
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} 取消监听函数
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event).add(callback)
    return () => this.off(event, callback)
  }

  /**
   * 监听一次
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper)
      callback(...args)
    }
    return this.on(event, wrapper)
  }

  /**
   * 取消监听
   */
  off(event, callback) {
    const set = this._listeners.get(event)
    if (set) {
      set.delete(callback)
      if (set.size === 0) this._listeners.delete(event)
    }
  }

  /**
   * 触发事件
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    const set = this._listeners.get(event)
    if (set) {
      set.forEach(cb => {
        try {
          cb(...args)
        } catch (e) {
          console.error(`[EventManager] Error in listener for "${event}":`, e)
        }
      })
    }
  }

  /**
   * 清除所有监听
   */
  clear() {
    this._listeners.clear()
  }
}

// 预定义事件名
export const EVENTS = {
  READY: 'ready',
  ELEMENT_SELECTED: 'element.selected',
  ELEMENT_CREATED: 'element.created',
  ELEMENT_CHANGED: 'element.changed',
  ELEMENT_REMOVED: 'element.removed',
  PROCESS_CHANGED: 'process.changed',
  VALIDATION_START: 'validation.start',
  VALIDATION_END: 'validation.end',
  XML_IMPORTED: 'xml.imported',
  XML_EXPORTED: 'xml.exported',
  DATA_CHANGED: 'data.changed',
  CANVAS_CLICK: 'canvas.click',
}
