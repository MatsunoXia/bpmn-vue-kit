<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <div
        v-for="item in menuItems"
        :key="item.key"
        class="menu-item"
        :class="{ disabled: item.disabled, divider: item.divider }"
        @click="onItemClick(item)"
      >
        <span class="menu-icon">{{ item.icon }}</span>
        <span class="menu-label">{{ item.label }}</span>
        <span class="menu-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  /** 当前选中元素类型 */
  elementType: { type: String, default: null },
})

const emit = defineEmits(['action'])

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const contextElement = ref(null)

// 菜单项
const menuItems = computed(() => {
  const items = []

  if (contextElement.value) {
    // 有选中元素
    items.push(
      { key: 'delete', icon: '🗑', label: '删除', shortcut: 'Delete', action: 'delete' },
      { key: 'divider1', divider: true },
      { key: 'copy', icon: '📋', label: '复制', shortcut: 'Ctrl+C', action: 'copy', disabled: true },
      { key: 'divider2', divider: true },
      { key: 'properties', icon: '⚙', label: '属性', action: 'properties' },
    )
  } else {
    // 空白处
    items.push(
      { key: 'paste', icon: '📋', label: '粘贴', shortcut: 'Ctrl+V', action: 'paste', disabled: true },
      { key: 'divider1', divider: true },
      { key: 'zoomFit', icon: '⊞', label: '适应画布', action: 'zoomFit' },
      { key: 'zoomReset', icon: '↺', label: '重置缩放', action: 'zoomReset' },
    )
  }

  return items
})

// 显示菜单
function show(event, element) {
  event.preventDefault()
  event.stopPropagation()
  x.value = event.clientX
  y.value = event.clientY
  contextElement.value = element
  visible.value = true
}

// 隐藏菜单
function hide() {
  visible.value = false
  contextElement.value = null
}

// 菜单项点击
function onItemClick(item) {
  if (item.disabled || item.divider) return
  emit('action', { action: item.action, element: contextElement.value })
  hide()
}

// 全局点击关闭
function onGlobalClick() {
  hide()
}

// 按 Esc 关闭
function onKeyDown(e) {
  if (e.key === 'Escape') hide()
}

onMounted(() => {
  document.addEventListener('click', onGlobalClick)
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onGlobalClick)
  document.removeEventListener('keydown', onKeyDown)
})

defineExpose({ show, hide })
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  min-width: 160px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: #303133;
  cursor: pointer;
  transition: background 0.15s;
}

.menu-item:hover:not(.disabled):not(.divider) {
  background: #ecf5ff;
  color: #409eff;
}

.menu-item.disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.menu-item.divider {
  height: 1px;
  background: #e4e7ed;
  padding: 0;
  margin: 4px 0;
  cursor: default;
}

.menu-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.menu-label {
  flex: 1;
}

.menu-shortcut {
  font-size: 11px;
  color: #c0c4cc;
  margin-left: 12px;
}
</style>
