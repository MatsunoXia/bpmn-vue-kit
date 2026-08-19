/**
 * BPMN Vue Kit - 元素数据管理器
 *
 * BPMN 模型仍然只由 bpmn.js 管理。
 * DataManager 只管理“不属于 BPMN 原生模型”的扩展数据，并统一分为：
 *
 * elementId -> {
 *   component: {},
 *   business: {}
 * }
 *
 * component：组件层配置，例如组件类型、版本、扩展配置。
 * business：业务层数据，例如审批人、表单、服务配置。
 *
 * 为了兼容 v0.2，getBusinessData / setBusinessData / exportAll 等旧 API 保留。
 */

function clone(value) {
  if (value == null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(item => clone(item))
  const result = {}
  for (const [key, item] of Object.entries(value)) {
    result[key] = clone(item)
  }
  return result
}

export class DataManager {
  constructor(eventManager) {
    this._events = eventManager
    // Map<elementId, { component: Object, business: Object }>
    this._elements = new Map()
    // 流程级扩展数据，同样采用 component / business 双层模型
    this._process = {
      component: {},
      business: {},
    }
  }

  _normalizeElementData(data = {}) {
    // 新结构
    if (data && (data.component || data.business)) {
      return {
        component: clone(data.component || {}),
        business: clone(data.business || {}),
      }
    }

    // 兼容 v0.2 扁平业务数据
    return {
      component: {},
      business: clone(data || {}),
    }
  }

  _ensureElement(elementId) {
    let record = this._elements.get(elementId)
    if (!record) {
      record = { component: {}, business: {} }
      this._elements.set(elementId, record)
    }
    return record
  }

  // ==================== 元素完整数据 ====================

  initElement(element, initialData = {}) {
    const id = typeof element === 'string' ? element : element?.id
    if (!id) return null

    if (this._elements.has(id)) {
      return this.getElementData(id)
    }

    const record = this._normalizeElementData(initialData)
    this._elements.set(id, record)
    return this.getElementData(id)
  }

  hasElement(elementId) {
    return this._elements.has(elementId)
  }

  getElementData(elementId) {
    const record = this._elements.get(elementId)
    if (!record) return null
    return clone(record)
  }

  setElementData(elementId, data = {}) {
    if (!elementId) return false

    const normalized = this._normalizeElementData(data)
    this._elements.set(elementId, normalized)

    this._events.emit('data.changed', {
      elementId,
      target: 'element',
      replaced: true,
      data: clone(normalized),
    })

    return true
  }

  updateElementData(elementId, target, updates = {}) {
    if (!elementId || !['component', 'business'].includes(target)) return false

    const record = this._ensureElement(elementId)
    const current = record[target] || {}
    record[target] = {
      ...current,
      ...clone(updates),
    }

    this._events.emit('data.changed', {
      elementId,
      target,
      updates: clone(updates),
    })

    return true
  }

  // ==================== Business 数据（兼容 API） ====================

  getBusinessData(elementId) {
    const record = this._elements.get(elementId)
    return record ? clone(record.business) : null
  }

  get(elementId) {
    return this.getBusinessData(elementId)
  }

  updateBusinessData(elementId, updates = {}) {
    return this.updateElementData(elementId, 'business', updates)
  }

  update(elementId, updates = {}) {
    return this.updateBusinessData(elementId, updates)
  }

  setBusinessData(elementId, data = {}) {
    if (!elementId) return false

    const record = this._ensureElement(elementId)
    record.business = clone(data)

    this._events.emit('data.changed', {
      elementId,
      target: 'business',
      replaced: true,
      data: clone(record.business),
    })

    return true
  }

  set(elementId, data = {}) {
    return this.setBusinessData(elementId, data)
  }

  // ==================== Component 数据 ====================

  getComponentData(elementId) {
    const record = this._elements.get(elementId)
    return record ? clone(record.component) : null
  }

  updateComponentData(elementId, updates = {}) {
    return this.updateElementData(elementId, 'component', updates)
  }

  setComponentData(elementId, data = {}) {
    if (!elementId) return false

    const record = this._ensureElement(elementId)
    record.component = clone(data)

    this._events.emit('data.changed', {
      elementId,
      target: 'component',
      replaced: true,
      data: clone(record.component),
    })

    return true
  }

  // ==================== 元素删除 ====================

  removeElement(elementId) {
    const existed = this._elements.delete(elementId)

    if (existed) {
      this._events.emit('data.changed', {
        elementId,
        removed: true,
      })
    }

    return existed
  }

  remove(elementId) {
    return this.removeElement(elementId)
  }

  removeElements(elementIds = []) {
    for (const id of elementIds) this.removeElement(id)
  }

  removeElementsNotIn(validIds) {
    const validIdSet = validIds instanceof Set
      ? validIds
      : new Set(validIds || [])

    const removedIds = []

    for (const id of this._elements.keys()) {
      if (!validIdSet.has(id)) {
        this._elements.delete(id)
        removedIds.push(id)
      }
    }

    if (removedIds.length > 0) {
      this._events.emit('data.changed', {
        removedIds,
        cleanup: true,
      })
    }

    return removedIds
  }

  // ==================== 流程数据 ====================

  getProcessData() {
    return clone(this._process.business)
  }

  getProcessElementData() {
    return clone(this._process)
  }

  initProcess(initialData = {}) {
    if (
      Object.keys(this._process.business).length > 0 ||
      Object.keys(this._process.component).length > 0
    ) {
      return this.getProcessElementData()
    }

    const normalized = this._normalizeElementData(initialData)
    this._process = normalized
    return this.getProcessElementData()
  }

  updateProcessData(target, updates = {}) {
    if (!['component', 'business'].includes(target)) return false

    this._process[target] = {
      ...this._process[target],
      ...clone(updates),
    }

    this._events.emit('data.changed', {
      elementId: 'process',
      target,
      updates: clone(updates),
    })

    return true
  }

  updateProcessBusiness(updates = {}) {
    return this.updateProcessData('business', updates)
  }

  setProcessData(data = {}) {
    const normalized = this._normalizeElementData(data)
    this._process = normalized

    this._events.emit('data.changed', {
      elementId: 'process',
      target: 'business',
      replaced: true,
      data: clone(normalized.business),
    })

    return true
  }

  setProcessElementData(data = {}) {
    this._process = this._normalizeElementData(data)

    this._events.emit('data.changed', {
      elementId: 'process',
      target: 'element',
      replaced: true,
      data: clone(this._process),
    })

    return true
  }

  getProcessComponentData() {
    return clone(this._process.component)
  }

  setProcessComponentData(data = {}) {
    this._process.component = clone(data)
    this._events.emit('data.changed', {
      elementId: 'process',
      target: 'component',
      replaced: true,
      data: clone(this._process.component),
    })
    return true
  }

  // ==================== 导入导出 ====================

  /**
   * 保持 v0.2 的纯业务数据导出格式，避免破坏已有调用方。
   */
  exportAll() {
    const elements = {}
    for (const [id, record] of this._elements) {
      elements[id] = clone(record.business)
    }

    return {
      process: clone(this._process.business),
      elements,
    }
  }

  /**
   * 第二阶段标准扩展数据快照。
   */
  exportElementData() {
    const elements = {}
    for (const [id, record] of this._elements) {
      elements[id] = clone(record)
    }

    return {
      version: '2.0',
      process: clone(this._process),
      elements,
    }
  }

  exportBusinessData() {
    return this.exportAll()
  }

  importAll(data = {}, options = {}) {
    const { replace = false } = options

    if (replace) this.clear()

    if (data.process && typeof data.process === 'object') {
      // 支持新结构 process:{component,business}
      if (data.process.component || data.process.business) {
        this._process = this._normalizeElementData(data.process)
      } else {
        Object.assign(this._process.business, clone(data.process))
      }
    }

    const elements = data.elements || data.nodes || {}

    for (const [id, rawData] of Object.entries(elements)) {
      if (!rawData || typeof rawData !== 'object') continue

      let normalized

      if (rawData.component || rawData.business) {
        normalized = this._normalizeElementData(rawData)
      } else if (data.nodes) {
        const { type, name, ...business } = rawData
        normalized = this._normalizeElementData(business)
      } else {
        normalized = this._normalizeElementData(rawData)
      }

      const current = this._elements.get(id) || {
        component: {},
        business: {},
      }

      this._elements.set(id, {
        component: {
          ...current.component,
          ...normalized.component,
        },
        business: {
          ...current.business,
          ...normalized.business,
        },
      })
    }

    this._events.emit('data.changed', {
      imported: true,
      replace,
    })
  }

  clear() {
    this._elements.clear()
    this._process = {
      component: {},
      business: {},
    }
  }
}
