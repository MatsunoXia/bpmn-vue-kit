/**
 * 自定义属性组件渲染协议。
 * Registry 仍负责存储组件，Renderer 只负责归一化注册描述。
 */
export function normalizeComponentRegistration(type, registration) {
  if (typeof registration === 'function' || typeof registration === 'object' && registration?.render) {
    return { type, component: registration, props: {} }
  }

  return {
    type,
    component: registration?.component || registration,
    props: registration?.props || {},
    getValue: registration?.getValue,
    setValue: registration?.setValue,
    validate: registration?.validate,
  }
}
