# BPMN Vue Kit

**Schema-driven BPMN Designer for Vue 3**

一个面向业务流程设计场景的 Vue 3 BPMN 组件库。底层使用 `bpmn-js`，通过 Schema 驱动右侧属性面板，并将 BPMN 原生模型、组件扩展数据、业务数据分层管理。


## 项目结构

```text
bpmn-vue-kit/
├── src/
│   ├── index.js                    # 对外统一入口
│   │
│   ├── core/                       # 设计器运行时编排层
│   │   ├── DesignerCore.js         # 核心协调器
│   │   ├── EventManager.js         # 统一事件总线
│   │   ├── ModeManager.js          # design / readonly 模式
│   │   └── index.js
│   │
│   ├── bpmn/                       # bpmn.js 适配层
│   │   ├── BpmnModel.js            # BPMN 模型查询
│   │   ├── BpmnSerializer.js       # BPMN XML 序列化
│   │   ├── BpmnEventAdapter.js     # BPMN 事件适配
│   │   ├── locale.js               # bpmn.js 汉化
│   │   └── index.js
│   │
│   ├── data/                       # 扩展数据层
│   │   ├── DataManager.js          # component / business 数据管理
│   │   ├── DataSerializer.js       # 数据序列化适配
│   │   └── index.js
│   │
│   ├── schema/                     # Schema 层
│   │   ├── SchemaManager.js        # Schema 管理
│   │   ├── SchemaMatcher.js        # BPMN 类型与 Schema 匹配
│   │   └── index.js
│   │
│   ├── component/                  # 属性组件注册层
│   │   ├── ComponentRegistry.js
│   │   ├── ComponentRenderer.js
│   │   └── index.js
│   │
│   ├── plugin/                     # 插件层
│   │   ├── PluginManager.js
│   │   └── index.js
│   │
│   ├── validation/                 # 校验层
│   │   ├── Validator.js             # 综合校验
│   │   ├── PropertyValidator.js     # 属性校验
│   │   ├── ProcessValidator.js      # 流程校验
│   │   └── index.js
│   │
│   ├── engine/                     # 通用领域引擎
│   │   └── ConditionEngine.js      # 条件表达式计算
│   │
│   ├── shared/                     # 跨领域公共定义
│   │   └── constants.js
│   │
│   └── ui/                         # Vue UI 组件
│       ├── BpmnDesigner.vue
│       ├── BpmnToolbar.vue
│       ├── BpmnPalette.vue
│       ├── PropertyPanel.vue
│       ├── ValidationPanel.vue
│       ├── ConditionEditor.vue
│       ├── ContextMenu.vue
│       └── index.js
│
├── demo/                           # 本地演示应用
│   ├── App.vue
│   ├── schemas.js
│   ├── mock-forms.js
│   ├── validators.js
│   ├── plugins/
│   └── custom-components/
│
├── public/                          # Demo 静态资源
├── package.json
├── vite.config.js
└── README.md
```

## 安装与运行

```bash
npm install
npm run dev
```

默认 Demo 地址：`http://localhost:5173`

生产构建：

```bash
npm run build
```

## 三种使用模式

```vue
<!-- 新规：从零设计 -->
<BpmnDesigner :readonly="false" />

<!-- 编辑：加载已有流程 -->
<BpmnDesigner
  :readonly="false"
  :bpmn-xml="savedXml"
  :business-data="savedData"
/>

<!-- 只读：查看流程 -->
<BpmnDesigner
  :readonly="true"
  :bpmn-xml="savedXml"
  :business-data="savedData"
/>
```

## Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `customSchemas` | Object | `{}` | 自定义 Schema 配置 |
| `plugins` | Array | `[]` | 插件列表 |
| `forms` | Array | `[]` | 表单定义，供条件编辑器使用 |
| `readonly` | Boolean | `false` | 只读模式 |
| `bpmnXml` | String | `null` | 初始 BPMN XML |
| `businessData` | Object | `null` | 初始业务数据 |

## 数据导出格式

```js
core.exportBusinessData()
// {
//   process: { formId: 'expense_form' },
//   elements: {
//     UserTask_1: { assignee: '张三' },
//     "Flow_3": { conditions: [{ field: "amount", op: ">", value: "5000", logic: "AND" }] }
//   }
// }
```

## Schema 配置

Schema 决定右侧属性面板显示什么属性，以及属性属于哪一层数据。

```js
// demo/schemas.js
export default {
  'bpmn:UserTask': {
    groups: [
      { key: 'basic', label: '基础信息', order: 0 },
      { key: 'approval', label: '审批配置', order: 1 },
    ],
    properties: [
      { key: 'name', label: '节点名称', type: 'input', target: 'bpmn', group: 'basic', required: true },
      { key: 'assignee', label: '处理人', type: 'input', target: 'business', group: 'approval',
        required: true,
        rules: [
          { validator: (val) => val.length >= 2, message: '至少2个字符', level: 'error' },
        ]
      },
    ],
  },
}
```

## 插件开发

```js
const MyPlugin = {
  name: 'my-plugin',
  install(context) {
    context.componentRegistry.register('user-select', UserSelect)
    context.schemaManager.addProperties('bpmn:UserTask', [...])
    context.validator.addValidator(fn)
  },
}
```

## 自定义组件接口

| Prop | 类型 | 说明 |
|------|------|------|
| `modelValue` | any | 当前值 |
| `property` | Object | Schema 定义 |
| `elementId` | String | 元素 ID |
| `businessData` | Object | 业务数据 |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Delete` / `Backspace` | 删除选中元素 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做 |
| `Ctrl+S` | 导出 BPMN XML |

## 技术栈

- Vue 3 (Composition API)
- bpmn.js 17
- Vite 6
