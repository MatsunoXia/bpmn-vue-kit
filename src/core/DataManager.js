/**
 * BPMN Vue Kit - 业务数据管理器
 *
 * 核心职责：
 * 1. 只维护业务数据，不保存 BPMN 模型副本
 * 2. 维护流程级业务数据和元素级业务数据
 * 3. 提供业务数据的导入导出能力
 *
 * BPMN 模型（id/type/name/source/target 等）统一由 bpmn.js 管理。
 */

export class DataManager {
  constructor(eventManager) {
    this._events = eventManager

    // Map<elementId, BusinessData>
    this._elements = new Map()

    // 流程级业务数据
    this._process = {}
  }

  // ==================== 元素业务数据 ====================

  /**
   * 初始化元素业务数据。
   *
   * 如果元素已经存在，则不会覆盖已有数据。
   *
   * @param {Object|string} element bpmn.js element 或 elementId
   * @param {Object} initialData 初始业务数据
   * @returns {Object|null} 业务数据对象
   */
  initElement(element, initialData = {}) {
    const id = typeof element === 'string' ? element : element?.id

    if (!id) return null

    if (this._elements.has(id)) {
      return this._elements.get(id)
    }

    const data = { ...initialData }

    this._elements.set(id, data)

    return data
  }

  /**
   * 判断元素是否已经存在业务数据。
   */
  hasElement(elementId) {
    return this._elements.has(elementId)
  }

  /**
   * 获取元素业务数据。
   */
  getBusinessData(elementId) {
    return this._elements.get(elementId) || null
  }

  /**
   * 更新元素业务数据。
   *
   * 如果元素尚未初始化，会自动创建。
   */
  updateBusinessData(elementId, updates = {}) {
    if (!elementId) return false

    const current = this._elements.get(elementId) || {}

    Object.assign(current, updates)

    this._elements.set(elementId, current)

    this._events.emit('data.changed', {
      elementId,
      target: 'business',
      updates: { ...updates },
    })

    return true
  }

  /**
   * 设置元素完整业务数据。
   *
   * 与 updateBusinessData 的区别：
   * 会替换当前对象。
   */
  setBusinessData(elementId, data = {}) {
    if (!elementId) return false

    this._elements.set(elementId, {
      ...data,
    })

    this._events.emit('data.changed', {
      elementId,
      target: 'business',
      replaced: true,
      data: { ...data },
    })

    return true
  }

  /**
   * 移除元素业务数据。
   */
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

  /**
   * 批量移除。
   */
  removeElements(elementIds = []) {
    for (const id of elementIds) {
      this.removeElement(id)
    }
  }

  /**
   * 删除当前 BPMN 模型中已经不存在的业务数据。
   *
   * 用于：
   * - Undo
   * - Redo
   * - 删除节点
   * - BPMN 模型变化后的最终一致性校正
   */
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

  // ==================== 流程业务数据 ====================

  /**
   * 获取流程级业务数据。
   */
  getProcessData() {
    return {
      ...this._process,
    }
  }

  /**
   * 初始化流程业务数据。
   *
   * 如果已经存在数据，则不会覆盖。
   */
  initProcess(initialData = {}) {
    if (Object.keys(this._process).length > 0) {
      return this._process
    }

    this._process = {
      ...initialData,
    }

    return this._process
  }

  /**
   * 更新流程业务数据。
   */
  updateProcessBusiness(updates = {}) {
    Object.assign(this._process, updates)

    this._events.emit('data.changed', {
      elementId: 'process',
      target: 'business',
      updates: { ...updates },
    })

    return true
  }

  /**
   * 替换流程业务数据。
   */
  setProcessData(data = {}) {
    this._process = {
      ...data,
    }

    this._events.emit('data.changed', {
      elementId: 'process',
      target: 'business',
      replaced: true,
      data: { ...data },
    })

    return true
  }

  // ==================== 导入导出 ====================

  /**
   * 导出完整业务数据快照。
   *
   * 注意：
   * 这里故意不包含 BPMN type/name/id。
   *
   * BPMN XML / bpmn.js Model
   * 才是 BPMN 模型的唯一数据源。
   */
  exportAll() {
    const elements = {}

    for (const [id, businessData] of this._elements) {
      elements[id] = {
        ...businessData,
      }
    }

    return {
      process: {
        ...this._process,
      },

      elements,
    }
  }

  /**
   * 导出业务数据快照。
   *
   * DataManager 本身不负责补充 BPMN type/name。
   * DesignerCore.exportBusinessData()
   * 会基于 bpmn.js 模型完成组合。
   */
  exportBusinessData() {
    return this.exportAll()
  }

  /**
   * 导入业务数据。
   *
   * 默认采用 merge 模式：
   *
   * - Schema 默认值会保留
   * - 外部传入值覆盖默认值
   * - 不存在于当前 BPMN 模型的业务数据暂时保留
   * - 最后由 DesignerCore 负责清理孤儿数据
   *
   * @param {Object} data
   * @param {Object} options
   * @param {boolean} options.replace 是否替换当前业务数据
   */
  importAll(data = {}, options = {}) {
    const {
      replace = false,
    } = options

    if (replace) {
      this.clear()
    }

    if (
      data.process &&
      typeof data.process === 'object'
    ) {
      Object.assign(
        this._process,
        data.process
      )
    }

    const elements =
      data.elements ||
      data.nodes ||
      {}

    for (const [id, rawData] of Object.entries(elements)) {
      if (!rawData || typeof rawData !== 'object') {
        continue
      }

      let businessData = rawData

      /*
       * 兼容 0.3.x 旧格式：
       *
       * elements:
       *   UserTask_1:
       *     bpmnType: ...
       *     bpmn: ...
       *     business: {...}
       */
      if (
        rawData.business &&
        typeof rawData.business === 'object'
      ) {
        businessData = rawData.business
      }

      /*
       * 兼容旧的扁平格式：
       *
       * nodes:
       *   UserTask_1:
       *     type: userTask
       *     name: xxx
       *     assignee: xxx
       */
      else if (data.nodes) {
        const {
          type,
          name,
          ...business
        } = rawData

        businessData = business
      }

      const current =
        this._elements.get(id) || {}

      this._elements.set(id, {
        ...current,
        ...businessData,
      })
    }

    this._events.emit(
      'data.changed',
      {
        imported: true,
        replace,
      }
    )
  }

  /**
   * 清空所有业务数据。
   */
  clear() {
    this._elements.clear()
    this._process = {}
  }
}