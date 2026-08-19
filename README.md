# BPMN Vue Kit

**Schema-driven BPMN Designer for Vue 3**

## 版本

- **V0.1** — 基础绘制 + Schema 属性面板 + 校验
- **V0.2** — 条件表达式编辑器 + 右键菜单 + 快捷键 + 只读模式
- **V0.3** — 扁平化数据导出 + 自定义组件注册 + 插件机制 + 汉化 + 流程回显

## 项目结构

```
bpmn-vue-kit/
├── src/                          ← 组件库源码
│   ├── index.js                  ← 库入口
│   ├── locale.js                 ← bpmn.js 中文汉化
│   ├── core/                     ← 纯 JS 核心层
│   │   ├── DesignerCore.js       ← bpmn.js 封装
│   │   ├── SchemaManager.js      ← Schema 驱动
│   │   ├── DataManager.js        ← 数据模型（扁平导出）
│   │   ├── Validator.js          ← 校验引擎
│   │   ├── ComponentRegistry.js  ← 自定义组件注册
│   │   └── PluginManager.js      ← 插件机制
│   └── components/               ← Vue 组件
│       ├── BpmnDesigner.vue      ← 主组件
│       ├── BpmnToolbar.vue       ← 工具栏
│       ├── PropertyPanel.vue     ← 属性面板
│       ├── ValidationPanel.vue   ← 校验面板
│       ├── ConditionEditor.vue   ← 条件表达式编辑器
│       └── ContextMenu.vue       ← 右键菜单
└── demo/                         ← 示例代码
    ├── App.vue                   ← 三种模式演示
    ├── schemas.js                ← Schema 配置
    ├── mock-forms.js             ← 模拟表单数据
    ├── validators.js             ← 自定义校验器
    ├── plugins/                  ← 示例插件
    └── custom-components/        ← 示例自定义组件
```

## 开发

```bash
npm install
npm run dev
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
| `forms` | Array | `[]` | 表单定义（供条件编辑器使用） |
| `readonly` | Boolean | `false` | 只读模式 |
| `bpmnXml` | String | `null` | 初始 BPMN XML（回显用） |
| `businessData` | Object | `null` | 初始业务数据（回显用） |

## 数据导出格式

```js
core.exportBusinessData()
// {
//   process: { name: "请假审批", formId: "leave_form" },
//   nodes: {
//     "UserTask_1": { type: "userTask", name: "部门审批", assignee: "张三" },
//     "Flow_3": { type: "sequenceFlow", conditions: [{ field: "amount", op: ">", value: "5000" }] }
//   }
// }
```

## Schema 配置

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
    context.componentRegistry.register('user-select', MyUserSelect)
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
