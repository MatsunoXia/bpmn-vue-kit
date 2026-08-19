<template>
  <div class="condition-editor">
    <div class="condition-header">
      <span>条件表达式</span>
      <button class="add-btn" @click="addRule" :disabled="disabled">+ 添加</button>
    </div>

    <div class="condition-body" v-if="rules.length > 0">
      <div
        v-for="(rule, idx) in rules"
        :key="rule._id"
        class="condition-row"
      >
        <!-- 逻辑连接词（从第二行开始，每行前面一个 AND/OR 选择器）-->
        <div class="logic-wrap" v-if="idx > 0">
          <select v-model="rule.logic" class="logic-select" :disabled="disabled" @change="emitChange">
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </div>

        <select v-model="rule.field" class="cond-select field-select" :disabled="disabled" @change="emitChange">
          <option value="" disabled>字段</option>
          <option v-for="f in fields" :key="f.key" :value="f.key">{{ f.label }}</option>
        </select>

        <select v-model="rule.op" class="cond-select op-select" :disabled="disabled" @change="emitChange">
          <option value="" disabled>运算符</option>
          <option v-for="op in operators" :key="op.value" :value="op.value">{{ op.label }}</option>
        </select>

        <input
          v-if="!['notEmpty', 'empty'].includes(rule.op)"
          v-model="rule.value"
          type="text"
          class="cond-input"
          placeholder="值"
          :disabled="disabled"
          @input="emitChange"
        />

        <button class="remove-btn" @click="removeRule(idx)" :disabled="disabled">✕</button>
      </div>
    </div>

    <div class="condition-empty" v-else>
      <span>暂无条件，点击"添加"创建</span>
    </div>

    <div class="expression-preview" v-if="expression">
      <span class="preview-label">表达式：</span>
      <code class="preview-code">{{ expression }}</code>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  fields: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const operators = [
  { label: '等于', value: '==' },
  { label: '不等于', value: '!=' },
  { label: '大于', value: '>' },
  { label: '小于', value: '<' },
  { label: '大于等于', value: '>=' },
  { label: '小于等于', value: '<=' },
  { label: '包含', value: 'contains' },
  { label: '不为空', value: 'notEmpty' },
]

let idCounter = 0
const makeId = () => ++idCounter

const rules = ref([])
let skipWatch = false

watch(() => props.modelValue, (val) => {
  if (skipWatch) { skipWatch = false; return }
  if (Array.isArray(val) && val.length > 0) {
    rules.value = val.map(r => ({ ...r, _id: makeId(), logic: r.logic || 'AND' }))
  } else {
    rules.value = []
  }
}, { immediate: true })

const expression = computed(() => {
  const parts = []
  rules.value.forEach((r, idx) => {
    if (!r.field || !r.op) return
    let expr = ''
    if (r.op === 'notEmpty') expr = `${r.field} 不为空`
    else if (r.op === 'empty') expr = `${r.field} 为空`
    else expr = `${r.field} ${r.op} ${r.value}`

    if (idx > 0 && parts.length > 0) {
      parts.push(` ${r.logic || 'AND'} `)
    }
    parts.push(expr)
  })
  return parts.join('')
})

function addRule() {
  rules.value.push({ _id: makeId(), field: '', op: '==', value: '', logic: 'AND' })
  emitChange()
}

function removeRule(idx) {
  rules.value.splice(idx, 1)
  emitChange()
}

function emitChange() {
  skipWatch = true
  const out = rules.value.map(({ _id, ...rest }) => ({ ...rest }))
  emit('update:modelValue', out)
}
</script>

<style scoped>
.condition-editor {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.condition-header {
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 500;
  color: #303133;
}

.add-btn {
  padding: 2px 8px;
  border: 1px solid #409eff;
  border-radius: 3px;
  background: #fff;
  color: #409eff;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover:not(:disabled) { background: #409eff; color: #fff; }
.add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.condition-body { padding: 8px; }

.condition-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.logic-wrap { flex-shrink: 0; }

.logic-select {
  padding: 4px 6px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  background: #ecf5ff;
  color: #409eff;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

.logic-select:focus { border-color: #409eff; }
.logic-select:disabled { opacity: 0.5; cursor: not-allowed; }

.cond-select {
  padding: 4px 6px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
  background: #fff;
  cursor: pointer;
}

.cond-select:focus { border-color: #409eff; }
.cond-select:disabled { opacity: 0.5; cursor: not-allowed; }

.field-select { width: 90px; }
.op-select { width: 80px; }

.cond-input {
  flex: 1;
  min-width: 50px;
  padding: 4px 6px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
}

.cond-input:focus { border-color: #409eff; }
.cond-input:disabled { opacity: 0.5; cursor: not-allowed; }

.remove-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 3px;
  background: #fef0f0;
  color: #f56c6c;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.remove-btn:hover:not(:disabled) { background: #f56c6c; color: #fff; }
.remove-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.condition-empty {
  padding: 16px;
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
}

.expression-preview {
  padding: 8px 12px;
  background: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-label { font-size: 11px; color: #909399; flex-shrink: 0; }

.preview-code {
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 6px;
  border-radius: 3px;
  word-break: break-all;
}
</style>
