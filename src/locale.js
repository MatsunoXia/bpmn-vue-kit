/**
 * bpmn.js 中文翻译模块
 * 覆盖 palette 提示、属性面板、弹出菜单等所有 UI 文案
 */

const translations = {
  // ===== Palette 工具栏 =====
  'Activate hand tool': '激活抓手工具',
  'Activate lasso tool': '激活套索工具',
  'Activate create/remove space tool': '激活创建/删除空间工具',
  'Activate global connect tool': '激活全局连接工具',
  'Create start event': '创建开始事件',
  'Create intermediate/boundary event': '创建中间/边界事件',
  'Create end event': '创建结束事件',
  'Create expanded sub-process': '创建子流程',
  'Create gateway': '创建网关',
  'Create task': '创建任务',
  'Create data object': '创建数据对象',
  'Create data object reference': '创建数据对象引用',
  'Create data store': '创建数据存储',
  'Create data store reference': '创建数据存储引用',
  'Create group': '创建分组',
  'Create text annotation': '创建文本注释',

  // ===== 连接线 =====
  'Connect': '连接',
  'Delete': '删除',
  'Remove': '移除',

  // ===== 元素类型 =====
  'Start event': '开始事件',
  'End event': '结束事件',
  'Task': '任务',
  'User task': '用户任务',
  'Service task': '服务任务',
  'Script task': '脚本任务',
  'Send task': '发送任务',
  'Receive task': '接收任务',
  'Manual task': '手动任务',
  'Business rule task': '业务规则任务',
  'Sub-process (collapsed)': '子流程（折叠）',
  'Sub-process (expanded)': '子流程（展开）',
  'Call activity': '调用活动',
  'Exclusive gateway': '排他网关',
  'Parallel gateway': '并行网关',
  'Inclusive gateway': '包容网关',
  'Complex gateway': '复杂网关',
  'Event-based gateway': '事件网关',
  'Intermediate throw event': '中间抛出事件',
  'Intermediate catch event': '中间捕获事件',
  'Boundary event': '边界事件',
  'Data Object Reference': '数据对象引用',
  'Data Store Reference': '数据存储引用',
  'Group': '分组',
  'Text Annotation': '文本注释',
  'Participant': '参与者/泳道',

  // ===== Replace 菜单（点击节点后弹出的替换菜单）=====
  'Append end event': '添加结束事件',
  'Append gateway': '添加网关',
  'Append task': '添加任务',
  'Append user task': '添加用户任务',
  'Append service task': '添加服务任务',
  'Append script task': '添加脚本任务',
  'Append intermediate/boundary event': '添加中间抛出事件',
  'Change element': '更改类型',
  'Connect to other element': '连接到其他元素',
  'Add text annotation': '添加文本注释',
  'Delete': '删除',

  // ===== 属性面板 =====
  'General': '基本信息',
  'Details': '详情',
  'Listeners': '监听器',
  'Extension Properties': '扩展属性',
  'Extension Elements': '扩展元素',
  'Asynchronous Continuations': '异步延续',
  'Job Configuration': '任务配置',
  'External Task Configuration': '外部任务配置',
  'Task Listeners': '任务监听器',
  'Execution Listeners': '执行监听器',
  'Field Injection': '字段注入',
  'Forms': '表单',
  'Input/Output': '输入/输出',
  'Connector': '连接器',
  'Documentation': '文档',
  'History Time To Live': '历史存活时间',
  'Candidate starter': '候选启动人',
  'Tasklist': '任务列表',

  // ===== 字段标签 =====
  'Id': 'ID',
  'Name': '名称',
  'Version Tag': '版本标签',
  'Executable': '可执行',
  'Documentation': '文档',
  'Element Documentation': '元素文档',
  'History Time To Live': '历史保留时间',
  'Task Priority': '任务优先级',
  'Start Initiator': '启动发起人',
  'Assignee': '处理人',
  'Candidate Users': '候选用户',
  'Candidate Groups': '候选组',
  'Due Date': '截止日期',
  'Follow Up Date': '跟进日期',
  'Description': '描述',
  'Implementation': '实现方式',
  'Delegate Expression': '委托表达式',
  'Class': 'Java 类',
  'Expression': '表达式',
  'Result Variable': '结果变量',
  'Condition Expression': '条件表达式',
  'Condition': '条件',
  'Default Flow': '默认流',
  'Timer Definition Type': '定时器定义类型',
  'Timer Definition': '定时器定义',
  'Message': '消息',
  'Signal': '信号',
  'Error': '错误',
  'Escalation': '升级',
  'Compensation': '补偿',
  'Cancel': '取消',
  'Multi-Instance': '多实例',
  'Loop Characteristics': '循环特性',
  'Collection': '集合',
  'Element Variable': '元素变量',
  'Completion Condition': '完成条件',

  // ===== 通用操作 =====
  'Save': '保存',
  'Cancel': '取消',
  'Close': '关闭',
  'Remove': '移除',
  'Add': '添加',
  'Edit': '编辑',
  'Create': '创建',
  'Update': '更新',
  'Search': '搜索',
  'None': '无',
  '<none>': '<无>',
  '<default>': '<默认>',
}

/**
 * 翻译函数
 * @param {string} template - 原始文本
 * @param {object} replacements - 替换变量 { count: 5 }
 * @returns {string}
 */
function translate(template, replacements) {
  let result = translations[template] || template

  // 处理替换变量，如 "{{count}} items selected" → "已选择 {{count}} 个项目"
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    })
  }

  return result
}

/**
 * bpmn.js translate 模块
 * 通过 DI 注入覆盖默认翻译
 */
export default {
  __init__: ['translate'],
  translate: ['value', translate],
}

export { translate, translations }
