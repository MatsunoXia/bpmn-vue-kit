<template>
  <div class="property-panel" v-if="schema">
    <!-- 元素标题 -->
    <div class="panel-header">
      <span class="panel-icon">{{ icon }}</span>
      <span class="panel-title">{{ title }}</span>
    </div>

    <!-- 分组渲染 -->
    <div class="panel-groups">
      <div
        v-for="group in visibleGroups"
        :key="group.key"
        class="panel-group"
      >
        <div
          class="group-header"
          @click="toggleGroup(group.key)"
        >
          <span class="group-arrow" :class="{ collapsed: collapsedGroups.has(group.key) }">▼</span>
          <span>{{ group.label }}</span>
        </div>

        <div class="group-body" v-show="!collapsedGroups.has(group.key)">
          <div
            v-for="prop in getPropertiesForGroup(group.key)"
            :key="prop.key"
            class="form-item"
            :class="{ 'has-error': hasError(prop.key) }"
            v-show="isVisible(prop)"
          >
            <label class="form-label">
              <span class="required-mark" v-if="prop.required">*</span>
              {{ prop.label }}
            </label>

            <!-- 自定义组件 -->
            <component
              v-if="isCustomType(prop.type)"
              :is="getCustomComponent(prop.type)"
              :model-value="getValue(prop)"
              :property="prop"
              :element-id="elementId"
              :business-data="businessData"
              @update:model-value="onInput(prop, $event)"
            />

            <!-- 内置组件：Input -->
            <input
              v-else-if="prop.type === 'input'"
              type="text"
              :value="getValue(prop)"
              :placeholder="prop.placeholder"
              :readonly="prop.readonly || readonly"
              :disabled="prop.disabled || readonly"
              @input="onInput(prop, $event.target.value)"
              class="form-control"
            />

            <!-- 内置组件：Textarea -->
            <textarea
              v-else-if="prop.type === 'textarea'"
              :value="getValue(prop)"
              :placeholder="prop.placeholder"
              :readonly="prop.readonly || readonly"
              :disabled="prop.disabled || readonly"
              @input="onInput(prop, $event.target.value)"
              class="form-control"
              rows="3"
            />

            <!-- 内置组件：Number -->
            <input
              v-else-if="prop.type === 'number'"
              type="number"
              :value="getValue(prop)"
              :placeholder="prop.placeholder"
              :readonly="prop.readonly || readonly"
              :disabled="prop.disabled || readonly"
              @input="onInput(prop, Number($event.target.value))"
              class="form-control"
            />

            <!-- 内置组件：Select -->
            <select
              v-else-if="prop.type === 'select'"
              :value="getValue(prop)"
              :disabled="prop.disabled || readonly"
              @change="onInput(prop, $event.target.value)"
              class="form-control"
            >
              <option value="" disabled>{{ prop.placeholder || '请选择' }}</option>
              <option
                v-for="opt in prop.options"
                :key="opt.value"
                :value="opt.value"
              >{{ opt.label }}</option>
            </select>

            <!-- 内置组件：Switch -->
            <div v-else-if="prop.type === 'switch'" class="switch-wrap">
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="getValue(prop)"
                  :disabled="prop.disabled || readonly"
                  @change="onInput(prop, $event.target.checked)"
                />
                <span class="switch-slider"></span>
              </label>
              <span class="switch-label">{{ getValue(prop) ? '是' : '否' }}</span>
            </div>

            <!-- 内置组件：Checkbox -->
            <div v-else-if="prop.type === 'checkbox'" class="checkbox-wrap">
              <input
                type="checkbox"
                :checked="getValue(prop)"
                :disabled="prop.disabled || readonly"
                @change="onInput(prop, $event.target.checked)"
              />
            </div>

            <!-- 内置组件：Radio -->
            <div v-else-if="prop.type === 'radio'" class="radio-wrap">
              <label
                v-for="opt in prop.options"
                :key="opt.value"
                class="radio-item"
              >
                <input
                  type="radio"
                  :name="prop.key"
                  :value="opt.value"
                  :checked="getValue(prop) === opt.value"
                  :disabled="prop.disabled || readonly"
                  @change="onInput(prop, opt.value)"
                />
                <span>{{ opt.label }}</span>
              </label>
            </div>

            <!-- 条件表达式编辑器（仅网关出线显示） -->
            <ConditionEditor
              v-else-if="prop.type === 'condition' && isGatewayFlow"
              :model-value="getConditionRules(prop)"
              :fields="conditionFields"
              :disabled="readonly"
              @update:model-value="onConditionChange(prop, $event)"
            />
            <!-- 非网关出线时显示提示 -->
            <div v-else-if="prop.type === 'condition' && !isGatewayFlow" class="condition-hint">
              条件仅在网关分支连线中配置
            </div>


            <!-- 错误提示 -->
            <div class="form-error" v-if="hasError(prop.key)">
              {{ getError(prop.key) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 未选中时 -->
  <div class="property-panel empty" v-else>
    <div class="empty-tip">点击画布中的元素查看属性</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BPMN_TYPES } from '../core/constants.js'
import ConditionEditor from './ConditionEditor.vue'

const props = defineProps({
  elementId: { type: String, default: null },
  elementType: { type: String, default: null },
  schema: { type: Object, default: null },
  bpmnData: { type: Object, default: () => ({}) },
  businessData: { type: Object, default: () => ({}) },
  validationErrors: { type: Array, default: () => [] },
  /** 自定义组件注册中心实例 */
  componentRegistry: { type: Object, default: null },
  /** 条件编辑器可用字段 */
  formFields: { type: Array, default: () => [] },
  /** 只读模式 */
  readonly: { type: Boolean, default: false },
  /** 当前元素是否为网关出线（只有网关出线才显示条件编辑器） */
  isGatewayFlow: { type: Boolean, default: false },
})

const emit = defineEmits(['update:bpmnData', 'update:businessData'])

const collapsedGroups = ref(new Set())

const TITLE_MAP = {
  [BPMN_TYPES.PROCESS]: '流程信息',
  [BPMN_TYPES.START_EVENT]: '开始事件',
  [BPMN_TYPES.END_EVENT]: '结束事件',
  [BPMN_TYPES.USER_TASK]: '用户任务',
  [BPMN_TYPES.SERVICE_TASK]: '服务任务',
  [BPMN_TYPES.EXCLUSIVE_GATEWAY]: '排他网关',
  [BPMN_TYPES.PARALLEL_GATEWAY]: '并行网关',
  [BPMN_TYPES.SEQUENCE_FLOW]: '顺序流',
}

const ICON_MAP = {
  [BPMN_TYPES.PROCESS]: '⚙️',
  [BPMN_TYPES.START_EVENT]: '▶️',
  [BPMN_TYPES.END_EVENT]: '⏹️',
  [BPMN_TYPES.USER_TASK]: '👤',
  [BPMN_TYPES.SERVICE_TASK]: '⚙️',
  [BPMN_TYPES.EXCLUSIVE_GATEWAY]: '◇',
  [BPMN_TYPES.PARALLEL_GATEWAY]: '⊕',
  [BPMN_TYPES.SEQUENCE_FLOW]: '→',
}

const title = computed(() => TITLE_MAP[props.elementType] || '属性')
const icon = computed(() => ICON_MAP[props.elementType] || '📋')

const visibleGroups = computed(() => {
  if (!props.schema) return []
  return props.schema.groups || []
})

function getPropertiesForGroup(groupKey) {
  if (!props.schema) return []
  return (props.schema.properties || []).filter(p => p.group === groupKey)
}

function toggleGroup(key) {
  if (collapsedGroups.value.has(key)) {
    collapsedGroups.value.delete(key)
  } else {
    collapsedGroups.value.add(key)
  }
}

function getValue(prop) {
  if (prop.target === 'bpmn') {
    return props.bpmnData[prop.key] ?? prop.defaultValue ?? ''
  }
  return props.businessData[prop.key] ?? prop.defaultValue ?? ''
}

function onInput(prop, value) {
  if (prop.target === 'bpmn') {
    emit('update:bpmnData', { ...props.bpmnData, [prop.key]: value })
  } else {
    emit('update:businessData', { ...props.businessData, [prop.key]: value })
  }
}

function isVisible(prop) {
  if (!prop.visibleWhen) return true
  const checkData = prop.target === 'bpmn' ? props.bpmnData : props.businessData
  const fieldValue = checkData[prop.visibleWhen.field]
  const { op, value } = prop.visibleWhen

  switch (op) {
    case '==': return fieldValue == value
    case '===': return fieldValue === value
    case '!=': return fieldValue != value
    case 'in': return Array.isArray(value) && value.includes(fieldValue)
    case 'notEmpty': return fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
    default: return true
  }
}

// 自定义组件相关
function isCustomType(type) {
  return props.componentRegistry ? props.componentRegistry.has(type) : false
}

function getCustomComponent(type) {
  return props.componentRegistry ? props.componentRegistry.get(type) : null
}

// 校验错误
const errorMap = computed(() => {
  const map = {}
  for (const err of props.validationErrors) {
    if (err.field && err.elementId === props.elementId) {
      map[err.field] = err.message
    }
  }
  return map
})

function hasError(fieldKey) { return !!errorMap.value[fieldKey] }
function getError(fieldKey) { return errorMap.value[fieldKey] || '' }

// 条件编辑器相关
// 条件编辑器字段：优先使用 formFields（流程绑定的表单字段），否则用默认值
const conditionFields = computed(() => {
  if (props.formFields && props.formFields.length > 0) return props.formFields
  return [
    { key: 'amount', label: '金额' },
    { key: 'department', label: '部门' },
    { key: 'level', label: '级别' },
    { key: 'status', label: '状态' },
  ]
})

function getConditionRules(prop) {
  const data = prop.target === 'bpmn' ? props.bpmnData : props.businessData
  // 优先读 rules 数组，否则从 expression 字符串解析
  if (data.conditions && Array.isArray(data.conditions)) {
    return data.conditions
  }
  return []
}

function onConditionChange(prop, rules) {
  // 存储 rules 数组 + 生成的表达式字符串
  const expression = rules
    .filter(r => r.field && r.op)
    .map(r => {
      if (r.op === 'notEmpty') return `${r.field} 不为空`
      return `${r.field} ${r.op} ${r.value}`
    })
    .join(' AND ')

  const data = {
    ...props.businessData,
    conditions: rules,
    conditionExpression: expression,
  }
  emit('update:businessData', data)
}
</script>

<style scoped>
.property-panel {
  width: 320px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
  font-size: 13px;
}

.property-panel.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-tip {
  color: #909399;
  font-size: 14px;
}

.panel-header {
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.panel-icon { font-size: 18px; }

.group-header {
  padding: 10px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #303133;
}

.group-header:hover { background: #f0f2f5; }

.group-arrow {
  font-size: 10px;
  transition: transform 0.2s;
}

.group-arrow.collapsed { transform: rotate(-90deg); }

.group-body { padding: 8px 16px 12px; }

.form-item { margin-bottom: 14px; }
.form-item.hidden { display: none; }
.form-item.has-error .form-control { border-color: #f56c6c; }

.form-label {
  display: block;
  margin-bottom: 4px;
  color: #606266;
  font-size: 12px;
}

.required-mark { color: #f56c6c; margin-right: 2px; }

.form-control {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  color: #303133;
  background: #fff;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-control:focus { border-color: #409eff; }

.form-control:read-only {
  background: #f5f7fa;
  color: #909399;
}

textarea.form-control {
  resize: vertical;
  min-height: 60px;
}

select.form-control { cursor: pointer; }

.form-error {
  color: #f56c6c;
  font-size: 11px;
  margin-top: 4px;
}

.condition-hint {
  color: #909399;
  font-size: 12px;
  padding: 8px 0;
}

/* Switch */
.switch-wrap { display: flex; align-items: center; gap: 8px; }

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input { opacity: 0; width: 0; height: 0; }

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #dcdfe6;
  transition: 0.3s;
  border-radius: 20px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.switch input:checked + .switch-slider { background-color: #409eff; }
.switch input:checked + .switch-slider:before { transform: translateX(20px); }

.switch-label { color: #606266; font-size: 12px; }

/* Radio */
.radio-wrap { display: flex; flex-direction: column; gap: 6px; }

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #303133;
}

.radio-item input[type="radio"] { margin: 0; }

.checkbox-wrap input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
</style>
