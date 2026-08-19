/**
 * 设计器模式管理。
 */
export class ModeManager {
  constructor(mode = 'design') {
    this.mode = mode
  }

  isReadonly() {
    return this.mode === 'readonly'
  }

  assertEditable() {
    return !this.isReadonly()
  }

  setMode(mode) {
    if (mode !== 'design' && mode !== 'readonly') {
      throw new Error(`Unsupported designer mode: ${mode}`)
    }
    this.mode = mode
  }
}
