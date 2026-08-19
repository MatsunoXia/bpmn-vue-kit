<template>
  <div class="bpmn-palette">
    <!-- 搜索框 -->
    <div class="palette-search">
      <input
        v-model="searchText"
        type="text"
        placeholder="搜索节点..."
        class="search-input"
      />
    </div>

    <!-- 节点分组 -->
    <div class="palette-groups">
      <div
        v-for="group in filteredGroups"
        :key="group.key"
        class="palette-group"
      >
        <div
          class="group-title"
          @click="toggleGroup(group.key)"
        >
          <span class="group-arrow" :class="{ collapsed: collapsedGroups.has(group.key) }">▼</span>
          <span>{{ group.label }}</span>
        </div>

        <div class="group-items" v-show="!collapsedGroups.has(group.key)">
          <div
            v-for="item in group.items"
            :key="item.type"
            class="palette-item"
            :draggable="true"
            @dragstart="onDragStart($event, item)"
            @click="$emit('add-element', item)"
          >
            <span class="item-icon" v-html="item.icon"></span>
            <span class="item-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['add-element'])

const searchText = ref('')
const collapsedGroups = ref(new Set())

// 节点定义
const groups = [
  {
    key: 'event',
    label: '事件',
    items: [
      { type: 'bpmn:StartEvent', label: '开始事件', icon: '▶', className: 'bpmn-icon-start-event-none' },
      { type: 'bpmn:EndEvent', label: '结束事件', icon: '⏹', className: 'bpmn-icon-end-event-none' },
    ],
  },
  {
    key: 'task',
    label: '任务',
    items: [
      { type: 'bpmn:UserTask', label: '用户任务', icon: '👤', className: 'bpmn-icon-user-task' },
      { type: 'bpmn:ServiceTask', label: '服务任务', icon: '⚙', className: 'bpmn-icon-service-task' },
    ],
  },
  {
    key: 'gateway',
    label: '网关',
    items: [
      { type: 'bpmn:ExclusiveGateway', label: '排他网关', icon: '◇', className: 'bpmn-icon-gateway-xor' },
      { type: 'bpmn:ParallelGateway', label: '并行网关', icon: '⊕', className: 'bpmn-icon-gateway-parallel' },
    ],
  },
]

// 搜索过滤
const filteredGroups = computed(() => {
  if (!searchText.value.trim()) return groups

  const keyword = searchText.value.trim().toLowerCase()
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(
        item => item.label.toLowerCase().includes(keyword) || item.type.toLowerCase().includes(keyword)
      ),
    }))
    .filter(group => group.items.length > 0)
})

// 折叠切换
function toggleGroup(key) {
  if (collapsedGroups.value.has(key)) {
    collapsedGroups.value.delete(key)
  } else {
    collapsedGroups.value.add(key)
  }
}

// 拖拽开始
function onDragStart(event, item) {
  event.dataTransfer.setData('bpmn/element-type', item.type)
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<style scoped>
.bpmn-palette {
  width: 200px;
  height: 100%;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.palette-search {
  padding: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.search-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #409eff;
}

.palette-groups {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.group-title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  background: #f5f7fa;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.group-title:hover {
  background: #ecf0f5;
}

.group-arrow {
  font-size: 10px;
  transition: transform 0.2s;
}

.group-arrow.collapsed {
  transform: rotate(-90deg);
}

.group-items {
  padding: 4px 8px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin: 2px 0;
  border-radius: 4px;
  cursor: grab;
  font-size: 13px;
  color: #303133;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.palette-item:hover {
  background: #ecf5ff;
  border-color: #b3d8ff;
  color: #409eff;
}

.palette-item:active {
  cursor: grabbing;
  background: #d9ecff;
}

.item-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
