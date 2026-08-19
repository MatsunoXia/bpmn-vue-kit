<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <button class="tool-btn" title="撤销" :disabled="!canUndo" @click="$emit('undo')">↩</button>
      <button class="tool-btn" title="重做" :disabled="!canRedo" @click="$emit('redo')">↪</button>
      <div class="tool-divider"></div>
      <button class="tool-btn" title="放大" @click="$emit('zoomIn')">🔍+</button>
      <button class="tool-btn" title="缩小" @click="$emit('zoomOut')">🔍−</button>
      <button class="tool-btn" title="适应画布" @click="$emit('zoomFit')">⊞</button>
    </div>

    <div class="toolbar-center">
      <span class="process-name" v-if="processName">{{ processName }}</span>
      <span class="readonly-badge" v-if="isReadonly">🔒 只读</span>
    </div>

    <div class="toolbar-right">
      <button class="tool-btn" title="导入XML" @click="$emit('importXml')">📂 导入</button>
      <button class="tool-btn primary" title="导出XML" @click="$emit('exportXml')">💾 导出</button>
      <button class="tool-btn success" title="校验" @click="$emit('validate')">✅ 校验</button>
      <button class="tool-btn info" title="导出数据" @click="$emit('exportData')">📦 数据</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  processName: { type: String, default: '' },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  isReadonly: { type: Boolean, default: false },
})

defineEmits(['undo', 'redo', 'zoomIn', 'zoomOut', 'zoomFit', 'importXml', 'exportXml', 'validate', 'exportData'])
</script>

<style scoped>
.toolbar {
  height: 44px; background: #fff; border-bottom: 1px solid #e4e7ed;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; flex-shrink: 0;
}
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 4px; }
.toolbar-center { flex: 1; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; }
.process-name { font-size: 14px; font-weight: 500; color: #303133; }
.readonly-badge { font-size: 11px; background: #e6a23c; color: #fff; padding: 2px 8px; border-radius: 10px; }

.tool-btn {
  padding: 4px 10px; border: 1px solid #dcdfe6; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 12px; color: #606266;
  display: flex; align-items: center; gap: 4px; transition: all 0.2s;
}
.tool-btn:hover:not(:disabled) { border-color: #409eff; color: #409eff; }
.tool-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tool-btn.primary { background: #409eff; border-color: #409eff; color: #fff; }
.tool-btn.primary:hover:not(:disabled) { background: #66b1ff; }
.tool-btn.success { background: #67c23a; border-color: #67c23a; color: #fff; }
.tool-btn.success:hover:not(:disabled) { background: #85ce61; }
.tool-btn.info { background: #909399; border-color: #909399; color: #fff; }
.tool-btn.info:hover:not(:disabled) { background: #a6a9ad; }
.tool-divider { width: 1px; height: 20px; background: #e4e7ed; margin: 0 4px; }
</style>
