<template>
  <div
    class="bpmn-designer"
    :class="{ 'bpmn-readonly': isReadonly }"
    @contextmenu.prevent
  >
    <BpmnToolbar
      :process-name="processName"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-readonly="isReadonly"
      @undo="onUndo"
      @redo="onRedo"
      @zoom-in="onZoomIn"
      @zoom-out="onZoomOut"
      @zoom-fit="onZoomFit"
      @import-xml="onImportXml"
      @export-xml="onExportXml"
      @validate="onValidate"
      @export-data="onExportData"
    />

    <div class="designer-body">
      <div class="canvas-wrap" ref="canvasRef" @contextmenu="onCanvasContextMenu"></div>

      <div class="property-panel-wrap">
        <PropertyPanel
          :element-id="selectedId"
          :element-type="selectedType"
          :schema="selectedSchema"
          :element-data="selectedElementData"
          :validation-errors="validationErrors"
          :component-registry="componentRegistry"
          :form-fields="currentFormFields"
          :readonly="isReadonly"
          :is-gateway-flow="isGatewayFlow"
          @update:data="onElementDataChange"
        />
      </div>
    </div>

    <ValidationPanel
      v-if="showValidation"
      :results="validationErrors"
      @close="showValidation = false"
      @locate="onLocateElement"
    />


    <ContextMenu
      ref="contextMenuRef"
      :element-type="contextElementType"
      @action="onContextMenuAction"
    />
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  shallowRef,
} from 'vue'

import {
  DesignerCore,
  EVENTS,
} from '../core/index.js'
import { BPMN_TYPES } from '../shared/constants.js'
import { serializeConditions } from '../engine/ConditionEngine.js'

import BpmnToolbar from './BpmnToolbar.vue'
import PropertyPanel from './PropertyPanel.vue'
import ValidationPanel from './ValidationPanel.vue'
import ContextMenu from './ContextMenu.vue'

const props = defineProps({
  customSchemas: {
    type: Object,
    default: () => ({}),
  },

  plugins: {
    type: Array,
    default: () => [],
  },

  forms: {
    type: Array,
    default: () => [],
  },

  readonly: {
    type: Boolean,
    default: false,
  },

  bpmnXml: {
    type: String,
    default: null,
  },

  businessData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits([
  'ready',
  'export-xml',
  'export-data',
  'validation',
])

const canvasRef = ref(null)

const contextMenuRef =
  ref(null)

const core =
  shallowRef(null)

const selectedId =
  ref(null)

const selectedType =
  ref(null)

const selectedSchema =
  ref(null)

const selectedElementData =
  ref({ bpmn: {}, component: {}, business: {} })

const processName =
  ref('')

const canUndo =
  ref(false)

const canRedo =
  ref(false)

const isReadonly =
  ref(props.readonly)

const validationErrors =
  ref([])

const showValidation =
  ref(false)

const contextElementType =
  ref(null)

const componentRegistry =
  ref(null)

const processFormId =
  ref(null)

const currentFormFields =
  computed(() => {

    if (
      !processFormId.value ||
      !props.forms
    ) {
      return []
    }

    const form =
      props.forms.find(
        f =>
          f.id ===
          processFormId.value
      )

    return form?.fields || []
  })

/**
 * 当前选中的连线是否为网关出线。
 */
const isGatewayFlow =
  computed(() => {

    if (
      !core.value ||
      selectedType.value !==
      BPMN_TYPES.SEQUENCE_FLOW
    ) {
      return false
    }

    const el =
      core.value
        .getModeler()
        .get('elementRegistry')
        .get(selectedId.value)

    if (!el) return false

    const sourceEl =
      el.source

    if (sourceEl) {

      const type =
        sourceEl.type || ''

      if (
        type.includes('Gateway')
      ) {
        return true
      }
    }

    const sourceRef =
      el.businessObject?.sourceRef

    if (sourceRef) {

      const refId =
        sourceRef.id ||
        sourceRef

      const refEl =
        core.value
          .getModeler()
          .get('elementRegistry')
          .get(refId)

      if (
        refEl &&
        (refEl.type || '')
          .includes('Gateway')
      ) {
        return true
      }
    }

    return false
  })

// ==================== 初始化 ====================
onMounted(async () => {

  const designerCore =
    new DesignerCore({
      container:
        canvasRef.value,

      customSchemas:
        props.customSchemas,

      readonly:
        props.readonly,

      bpmnXml:
        props.bpmnXml,

      businessData:
        props.businessData,
    })

  /*
   * 重要：
   *
   * 插件必须在 init() 前安装。
   *
   * 因为插件可能通过 SchemaManager
   * 追加带 defaultValue 的业务属性。
   *
   * 只有这样，初始 BPMN 节点才能正确获得插件默认值。
   */
  if (
    props.plugins.length > 0
  ) {

    for (
      const plugin of props.plugins
    ) {

      designerCore.use(
        plugin
      )
    }
  }

  await designerCore.init()

  core.value = designerCore

  componentRegistry.value = designerCore.componentRegistry

  // ==================== 元素选择 ====================
  designerCore.events.on(
    EVENTS.ELEMENT_SELECTED,
    (info) => {

      if (
        info.id === 'process'
      ) {

        selectedId.value =
          'process'

        selectedType.value =
          BPMN_TYPES.PROCESS

        selectedSchema.value =
          designerCore.schemaMatcher.getSchema(
            BPMN_TYPES.PROCESS
          )

        const process =
          designerCore
            .getProcessElement()

        const elementData = designerCore.getElementData('process')
        selectedElementData.value = elementData || {
          bpmn: {},
          component: {},
          business: {},
        }

        processFormId.value =
          elementData?.business?.formId ||
          null

      } else {

        selectedId.value =
          info.id

        selectedType.value =
          info.type

        selectedSchema.value =
          designerCore.schemaMatcher.getSchema(
            info.type
          )

        refreshSelectedData()
      }
    }
  )

  designerCore.events.on(
    EVENTS.PROCESS_CHANGED,
    () => {
      updateUndoRedo()
      refreshSelectedData()
    }
  )

  designerCore.events.on(
    EVENTS.ELEMENT_CHANGED,
    () => {
      updateUndoRedo()
      refreshSelectedData()
    }
  )

  designerCore.events.on(
    EVENTS.ELEMENT_CREATED,
    () => {
      updateUndoRedo()
    }
  )

  designerCore.events.on(
    EVENTS.ELEMENT_REMOVED,
    () => {
      updateUndoRedo()
    }
  )

  designerCore.events.on(
    EVENTS.DATA_CHANGED,
    () => {
      refreshSelectedData()

      if (selectedId.value === 'process') {
        const elementData = designerCore.getElementData('process')
        processFormId.value = elementData?.business?.formId || null
      }
    }
  )

  designerCore.events.on(
    EVENTS.XML_IMPORTED,
    () => {

      updateUndoRedo()

      const process =
        designerCore
          .getProcessElement()

      const businessData =
        designerCore.data
          .getProcessData()

      processName.value =
        process
          ?.businessObject?.name ||
        ''

      processFormId.value =
        businessData.formId ||
        null
    }
  )

  const process =
    designerCore
      .getProcessElement()

  const initData =
    designerCore.data
      .getProcessData()

  processName.value =
    process
      ?.businessObject?.name ||
    ''

  processFormId.value =
    initData.formId ||
    null

  updateUndoRedo()

  emit(
    'ready',
    designerCore
  )
})

// ==================== 销毁 ====================
onBeforeUnmount(() => {

  document.removeEventListener(
    'keydown',
    onKeyDown
  )

  if (core.value) {
    core.value.destroy()
  }
})

// ==================== 属性数据 ====================
function refreshSelectedData() {

  if (!core.value || !selectedId.value) {
    return
  }

  const data = core.value.getElementData(selectedId.value)

  if (!data) return

  selectedElementData.value = data

  if (selectedId.value === 'process') {
    processName.value = data.bpmn?.name || ''
    processFormId.value = data.business?.formId || null
  }
}

// ==================== 统一属性数据修改 ====================
function onElementDataChange(payload) {
  if (
    !core.value ||
    !selectedId.value ||
    isReadonly.value ||
    !payload?.target
  ) {
    return
  }

  const target = payload.target
  const data = payload.data || {}

  const options =
    target === 'business' &&
      selectedType.value === BPMN_TYPES.SEQUENCE_FLOW &&
      Array.isArray(data.conditions)
      ? {
        conditionExpression: serializeConditions(data.conditions),
      }
      : undefined

  core.value.updateElementData(
    selectedId.value,
    target,
    data,
    options
  )

  if (selectedId.value === 'process' && target === 'bpmn' && data.name !== undefined) {
    processName.value = data.name
  }

  if (selectedId.value === 'process' && target === 'business') {
    processFormId.value = data.formId || null
  }
}

// ==================== 工具栏 ====================
function onUndo() {
  core.value?.undo()
}

function onRedo() {
  core.value?.redo()
}

function onZoomIn() {
  core.value?.zoomIn()
}

function onZoomOut() {
  core.value?.zoomOut()
}

function onZoomFit() {
  core.value?.zoomFit()
}

function updateUndoRedo() {
  if (!core.value) return
  canUndo.value = core.value.canUndo()
  canRedo.value = core.value.canRedo()
}

// ==================== XML 导入 ====================
async function onImportXml() {
  if (!core.value) return

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.bpmn,.xml'

  input.onchange =
    async (e) => {

      const file = e.target.files[0]

      if (!file) return
      try {

        await core.value.importXml(
          await file.text()
        )

        const process = core.value.getProcessElement()

        processName.value = process?.businessObject?.name || ''
        processFormId.value = core.value.data.getProcessData().formId || null

        selectedId.value = null
        selectedType.value = null
        selectedSchema.value = null

      } catch (err) {
        alert('导入失败：' + err.message)
      }
    }

  input.click()
}

// ==================== XML 导出 ====================
async function onExportXml() {

  if (!core.value) return
  try {

    const xml = await core.value.exportXml()

    const a = document.createElement('a')
    a.href =
      URL.createObjectURL(
        new Blob(
          [xml],
          {
            type:
              'application/xml',
          }
        )
      )

    a.download = 'process.bpmn'
    a.click()

    URL.revokeObjectURL(a.href)
    emit('export-xml', xml)

  } catch (err) {
    alert('导出失败：' + err.message)
  }
}

// ==================== 校验 ====================
function onValidate() {

  if (!core.value) return

  validationErrors.value = core.value.validate()
  showValidation.value = true

  emit('validation', validationErrors.value)
}

// ==================== 数据导出 ====================
function onExportData() {

  if (!core.value) return

  const data = core.value.exportAllData()

  const a = document.createElement('a')

  a.href =
    URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            data,
            null,
            2
          ),
        ],
        {
          type:
            'application/json',
        }
      )
    )

  a.download = 'process-data.json'

  a.click()

  URL.revokeObjectURL(a.href)

  emit('export-data', data)
}

// ==================== 校验定位 ====================
function onLocateElement(result) {

  if (
    !core.value ||
    !result.elementId ||
    result.elementId === 'process'
  ) {
    return
  }

  const el =
    core.value
      .getModeler()
      .get('elementRegistry')
      .get(result.elementId)

  if (el) {

    core.value
      .getModeler()
      .get('selection')
      .select(el)

    core.value
      .getModeler()
      .get('canvas')
      .scrollToElement(el)
  }
}

// ==================== 右键菜单 ====================
function onCanvasContextMenu(event) {
  if (!core.value || !contextMenuRef.value) {
    return
  }

  const node = event.target.closest('[data-element-id]')
  const id = node?.getAttribute('data-element-id')
  const element = id ? core.value.getModeler().get('elementRegistry').get(id) : null

  contextElementType.value = element?.type || null
  contextMenuRef.value.show(
    event,
    element
  )
}

function onContextMenuAction({
  action,
  element,
}) {

  if (!core.value) return

  switch (action) {

    case 'delete':
      if (element) {
        core.value.getModeler().get('selection').select(element)
        core.value.deleteSelected()
      } else {
        core.value.deleteSelected()
      }
      break

    case 'properties':
      if (element) {
        core.value.getModeler().get('selection').select(element)
      }
      break

    case 'zoomFit':
      core.value.zoomFit()
      break

    case 'zoomReset':
      core.value.zoomReset()
      break
  }
}

// ==================== 键盘 ====================
function onKeyDown(e) {
  if (!core.value) return

  if (
    [
      'INPUT',
      'TEXTAREA',
      'SELECT',
    ].includes(e.target.tagName
    )
  ) {
    return
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    core.value.deleteSelected()
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    core.value.undo()
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) ) {
    e.preventDefault()
    core.value.redo()
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    onExportXml()
  }
}

onMounted(() => {
  document.addEventListener(
    'keydown',
    onKeyDown
  )
})

defineExpose({

  getCore: () =>
    core.value,

  importXml: (xml) =>
    core.value?.importXml(xml),

  importAllData: (data, options) =>
    core.value?.importAllData(data, options),

  exportXml: () =>
    core.value?.exportXml(),

  exportAllData: () =>
    core.value?.exportAllData(),

  exportDefinition: () =>
    core.value?.exportDefinition(),

  importDefinition: (definition, options) =>
    core.value?.importDefinition(definition, options),

  exportBusinessData: () =>
    core.value?.exportBusinessData(),

  exportWorkflowData: () =>
    core.value?.exportWorkflowData(),

  validate: () =>
    core.value?.validate(),

  validateProcess: () =>
    core.value?.validateProcess(),

  validateProperties: () =>
    core.value?.validateProperties(),
})
</script>

<style scoped>
.bpmn-designer {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  overflow: hidden; border: 1px solid #e4e7ed;
  border-radius: 4px; background: #fff;
}
.designer-body { flex: 1; display: flex; overflow: hidden; }
.canvas-wrap { flex: 1; position: relative; background: #fafafa; }
.property-panel-wrap { flex-shrink: 0; overflow-y: auto; height: 100%; }
</style>
