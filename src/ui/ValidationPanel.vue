<template>
  <div class="validation-panel">
    <!-- 有错误 -->
    <div class="panel-header" v-if="results.length > 0">
      <span>校验结果</span>
      <span class="counts">
        <span class="error-count" v-if="errorCount > 0">❌ {{ errorCount }}</span>
        <span class="warn-count" v-if="warningCount > 0">⚠️ {{ warningCount }}</span>
      </span>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="result-list" v-if="results.length > 0">
      <div
        v-for="(result, idx) in results"
        :key="idx"
        class="result-item"
        :class="result.level"
        @click="$emit('locate', result)"
      >
        <span class="result-icon">{{ result.level === 'error' ? '❌' : '⚠️' }}</span>
        <div class="result-content">
          <div class="result-element">{{ result.elementName }}</div>
          <div class="result-message">{{ result.message }}</div>
        </div>
        <span class="locate-btn" title="定位到元素">📍</span>
      </div>
    </div>

    <!-- 校验通过 -->
    <div class="panel-success" v-else>
      <span class="success-icon">✅</span>
      <span class="success-text">校验通过，未发现问题</span>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  results: { type: Array, default: () => [] },
})

defineEmits(['close', 'locate'])

const errorCount = computed(() => props.results.filter(r => r.level === 'error').length)
const warningCount = computed(() => props.results.filter(r => r.level === 'warning').length)
</script>

<style scoped>
.validation-panel {
  background: #fff;
  border-top: 1px solid #e4e7ed;
  max-height: 200px;
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-header {
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 13px;
  position: sticky;
  top: 0;
}

.counts { flex: 1; display: flex; gap: 8px; }
.error-count { color: #f56c6c; }
.warn-count { color: #e6a23c; }

.close-btn {
  background: none; border: none; cursor: pointer;
  font-size: 14px; color: #909399; padding: 2px 4px;
}
.close-btn:hover { color: #303133; }

.result-list { padding: 4px 0; }

.result-item {
  display: flex; align-items: center; padding: 6px 12px;
  gap: 8px; cursor: pointer; transition: background 0.2s;
}
.result-item:hover { background: #f5f7fa; }
.result-item.error .result-element { color: #f56c6c; }
.result-item.warning .result-element { color: #e6a23c; }

.result-icon { font-size: 14px; flex-shrink: 0; }
.result-content { flex: 1; min-width: 0; }
.result-element { font-size: 12px; font-weight: 500; }
.result-message { font-size: 12px; color: #909399; margin-top: 2px; }

.locate-btn { font-size: 14px; opacity: 0; transition: opacity 0.2s; flex-shrink: 0; }
.result-item:hover .locate-btn { opacity: 1; }

/* 校验通过 */
.panel-success {
  padding: 10px 12px;
  background: #f0f9eb;
  border-top: 1px solid #e1f3d8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-success .success-icon { font-size: 16px; }

.panel-success .success-text {
  flex: 1;
  font-size: 13px;
  color: #67c23a;
  font-weight: 500;
}
</style>
