<template>
  <div class="app">
    <div class="app-header">
      <h1 class="app-title">BPMN Vue Kit <span class="version">V0.3</span></h1>
      <div class="header-actions">
        <button class="demo-btn" :class="{ active: mode === 'create' }" @click="switchMode('create')">📄 新规</button>
        <button class="demo-btn" :class="{ active: mode === 'edit' }" @click="switchMode('edit')">✏️ 编辑</button>
        <button class="demo-btn" :class="{ active: mode === 'readonly' }" @click="switchMode('readonly')">🔒 只读</button>
        <button class="demo-btn" @click="showDataDemo">📦 查看数据</button>
      </div>
    </div>

    <div class="app-body">
      <!--
        三种模式：
        - 新规：不传 bpmnXml，不传 businessData，readonly=false
        - 编辑：传 bpmnXml + businessData，readonly=false
        - 只读：传 bpmnXml + businessData，readonly=true
      -->
      <BpmnDesigner
        ref="designerRef"
        :key="designerKey"
        :custom-schemas="customSchemas"
        :plugins="plugins"
        :forms="forms"
        :readonly="currentReadonly"
        :bpmn-xml="currentBpmnXml"
        :business-data="currentBusinessData"
        @ready="onReady"
        @validation="onValidation"
      />
    </div>

    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <span>导出数据预览</span>
          <button class="close-btn" @click="showModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="data-tabs">
            <button :class="{ active: activeTab === 'business' }" @click="activeTab = 'business'">业务数据</button>
            <button :class="{ active: activeTab === 'full' }" @click="activeTab = 'full'">完整数据</button>
          </div>
          <pre class="data-preview">{{ activeTab === 'business' ? businessDataJson : fullDataJson }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BpmnDesigner } from '../src/index.js'
import forms from './mock-forms.js'
import customSchemasRaw from './schemas.js'
import { OaApprovalPlugin } from './plugins/oa-approval-plugin.js'
import { approvalValidator } from './validators.js'

// ===== 状态 =====
const designerRef = ref(null)
const mode = ref('create')         // 'create' | 'edit' | 'readonly'
const showModal = ref(false)
const activeTab = ref('business')
const businessDataJson = ref('')
const fullDataJson = ref('')

// 用 key 强制重建组件（切换模式时需要重新初始化 bpmn.js）
const designerKey = ref(0)

// ===== Schema：动态注入表单选项 =====
const customSchemas = JSON.parse(JSON.stringify(customSchemasRaw))
if (customSchemas['bpmn:Process']) {
  const formIdProp = customSchemas['bpmn:Process'].properties.find(p => p.key === 'formId')
  if (formIdProp) formIdProp.options = forms.map(f => ({ label: f.name, value: f.id }))
}

const plugins = [OaApprovalPlugin]

// ===== 模拟已有流程数据（编辑/只读模式回显用）=====
// 实际业务中从后端接口获取
const savedBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true" name="采购审批流程">
    <bpmn:startEvent id="StartEvent_1" name="开始" />
    <bpmn:userTask id="UserTask_1" name="部门主管审批" />
    <bpmn:exclusiveGateway id="Gateway_1" name="金额判断" />
    <bpmn:userTask id="UserTask_2" name="HR审批" />
    <bpmn:endEvent id="EndEvent_1" name="结束" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="Gateway_1" />
    <bpmn:sequenceFlow id="Flow_3" name="金额>5000" sourceRef="Gateway_1" targetRef="UserTask_2" />
    <bpmn:sequenceFlow id="Flow_4" name="金额<=5000" sourceRef="Gateway_1" targetRef="EndEvent_1" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="UserTask_2" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="100" y="200" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_1_di" bpmnElement="UserTask_1"><dc:Bounds x="200" y="178" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1_di" bpmnElement="Gateway_1"><dc:Bounds x="365" y="195" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_2_di" bpmnElement="UserTask_2"><dc:Bounds x="480" y="178" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1"><dc:Bounds x="440" y="320" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="136" y="218" /><di:waypoint x="200" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="300" y="218" /><di:waypoint x="365" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="415" y="218" /><di:waypoint x="480" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="390" y="245" /><di:waypoint x="390" y="338" /><di:waypoint x="440" y="338" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="530" y="258" /><di:waypoint x="530" y="338" /><di:waypoint x="476" y="338" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

const savedBusinessData = {
  process: {
    formId: 'expense_form',
    version: '1.0',
  },

  elements: {
    UserTask_1: {
      assigneeType: 'person',
      assignee: '张三',
      allowReject: true,
      allowTransfer: false,
    },

    UserTask_2: {
      assigneeType: 'role',
      role: 'HR',
      allowReject: true,
      allowTransfer: true,
    },

    Gateway_1: {
      defaultFlow: 'Flow_4',
    },

    Flow_3: {
      conditions: [
        {
          field: 'amount',
          op: '>',
          value: '5000',
          logic: 'AND',
        },
      ],
    },

    Flow_4: {
      conditions: [
        {
          field: 'amount',
          op: '<=',
          value: '5000',
          logic: 'AND',
        },
      ],
    },
  },
}

// ===== 模式切换 =====
const currentReadonly = computed(() => mode.value === 'readonly')
const currentBpmnXml = computed(() => mode.value === 'create' ? null : savedBpmnXml)
const currentBusinessData = computed(() => mode.value === 'create' ? null : savedBusinessData)

function switchMode(m) {
  mode.value = m
  designerKey.value++  // 强制重建组件
}

// ===== 事件 =====
function onReady(core) {
  core.validator.addValidator(approvalValidator)
}

function onValidation(results) {
  const errors = results.filter(r => r.level === 'error')
  const warnings = results.filter(r => r.level === 'warning')
  console.log(`校验: ${errors.length} 错误, ${warnings.length} 警告`)
}

function showDataDemo() {
  const core = designerRef.value?.getCore()
  if (!core) return
  businessDataJson.value = JSON.stringify(core.exportBusinessData(), null, 2)
  fullDataJson.value = JSON.stringify(core.exportAllData(), null, 2)
  showModal.value = true
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
.app { width: 100%; height: 100vh; display: flex; flex-direction: column; }
.app-header { height: 48px; background: #2c3e50; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; }
.app-title { color: #fff; font-size: 16px; font-weight: 600; }
.version { font-size: 11px; background: #409eff; padding: 2px 6px; border-radius: 3px; margin-left: 8px; font-weight: 400; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.demo-btn { padding: 5px 12px; background: #409eff; color: #fff; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.demo-btn:hover { background: #66b1ff; }
.demo-btn.active { background: #e6a23c; }
.app-body { flex: 1; overflow: hidden; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 700px; max-height: 80vh; background: #fff; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { padding: 12px 16px; background: #f5f7fa; border-bottom: 1px solid #e4e7ed; display: flex; align-items: center; justify-content: space-between; font-weight: 500; }
.close-btn { background: none; border: none; font-size: 16px; cursor: pointer; color: #909399; }
.close-btn:hover { color: #303133; }
.modal-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.data-tabs { display: flex; border-bottom: 1px solid #e4e7ed; }
.data-tabs button { flex: 1; padding: 10px; border: none; background: #fff; cursor: pointer; font-size: 13px; color: #606266; border-bottom: 2px solid transparent; }
.data-tabs button.active { color: #409eff; border-bottom-color: #409eff; }
.data-tabs button:hover { background: #f5f7fa; }
.data-preview { flex: 1; overflow: auto; padding: 16px; font-size: 12px; font-family: 'Consolas', 'Monaco', monospace; background: #fafafa; color: #303133; line-height: 1.6; white-space: pre; margin: 0; }
.bjs-powered-by { display: none !important; }
.djs-container { background: #fafafa !important; }
</style>
