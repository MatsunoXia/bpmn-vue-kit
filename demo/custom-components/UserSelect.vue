<template>
  <div class="user-select" ref="rootRef">
    <div
      class="select-input"
      :class="{ disabled: disabled || readonly }"
      @click="toggleDropdown"
    >
      <span class="selected-text" v-if="selectedUser">{{ selectedUser.name }}</span>
      <span class="placeholder" v-else>{{ property.placeholder || '请选择用户' }}</span>
      <span class="arrow">▼</span>
    </div>

    <div class="dropdown" v-if="showDropdown">
      <div class="search-wrap">
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索用户..."
          class="search-input"
          @click.stop
        />
      </div>
      <div class="user-list">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="user-item"
          :class="{ active: modelValue === user.id }"
          @click="selectUser(user)"
        >
          <span class="user-avatar">{{ user.name[0] }}</span>
          <div class="user-info">
            <span class="user-name">{{ user.name }}</span>
            <span class="user-dept">{{ user.department }}</span>
          </div>
        </div>
        <div class="empty-tip" v-if="filteredUsers.length === 0">无匹配用户</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  property: { type: Object, default: () => ({}) },
  elementId: { type: String, default: '' },
  businessData: { type: Object, default: () => ({}) },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const rootRef = ref(null)
const showDropdown = ref(false)
const searchText = ref('')

const users = ref([
  { id: 'user_001', name: '张三', department: '技术部' },
  { id: 'user_002', name: '李四', department: '产品部' },
  { id: 'user_003', name: '王五', department: '设计部' },
  { id: 'user_004', name: '赵六', department: '市场部' },
  { id: 'user_005', name: '钱七', department: '财务部' },
  { id: 'user_006', name: '孙八', department: '人事部' },
])

const selectedUser = computed(() => users.value.find(u => u.id === props.modelValue) || null)

const filteredUsers = computed(() => {
  if (!searchText.value.trim()) return users.value
  const kw = searchText.value.trim().toLowerCase()
  return users.value.filter(u => u.name.toLowerCase().includes(kw) || u.department.toLowerCase().includes(kw))
})

function toggleDropdown() {
  if (props.readonly || props.disabled) return

  showDropdown.value = !showDropdown.value
  if (showDropdown.value) searchText.value = ''
}

function selectUser(user) {
  if (props.readonly || props.disabled) return

  emit('update:modelValue', user.id)
  showDropdown.value = false
}

// 点击组件外部关闭（判断点击是否在本组件内）
function onClickOutside(e) {
  if (!showDropdown.value) return
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    showDropdown.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<style scoped>
.user-select { position: relative; }

.select-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  background: #fff;
  transition: border-color 0.2s;
}

.select-input:hover { border-color: #c0c4cc; }
.select-input.disabled { color: #c0c4cc; background: #f5f7fa; cursor: not-allowed; }
.select-input.disabled:hover { border-color: #dcdfe6; }

.selected-text { color: #303133; font-size: 13px; }
.placeholder { color: #c0c4cc; font-size: 13px; }
.arrow { font-size: 10px; color: #c0c4cc; }

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-top: 4px;
  max-height: 240px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-wrap { padding: 8px; border-bottom: 1px solid #f0f0f0; }

.search-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
}

.search-input:focus { border-color: #409eff; }

.user-list { overflow-y: auto; max-height: 180px; }

.user-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.user-item:hover { background: #f5f7fa; }
.user-item.active { background: #ecf5ff; }

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.user-info { display: flex; flex-direction: column; gap: 2px; }
.user-name { font-size: 13px; color: #303133; }
.user-dept { font-size: 11px; color: #909399; }

.empty-tip { padding: 16px; text-align: center; color: #c0c4cc; font-size: 12px; }
</style>
