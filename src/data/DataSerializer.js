/**
 * 业务数据序列化适配层。
 */
export class DataSerializer {
  constructor(dataManager) {
    this.dataManager = dataManager
  }

  export() {
    return this.dataManager.exportAll()
  }

  import(data, options = {}) {
    return this.dataManager.importAll(data, options)
  }
}
