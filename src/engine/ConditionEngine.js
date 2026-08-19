/**
 * 条件引擎
 *
 * 统一处理属性显示条件、Schema 校验条件和结构化条件表达式。
 */

export function getPathValue(data, path) {
  if (!data || !path) return undefined

  return String(path)
    .split('.')
    .reduce((current, key) => current == null ? undefined : current[key], data)
}

export function setPathValue(data, path, value) {
  const keys = String(path || '').split('.').filter(Boolean)
  if (keys.length === 0) return { ...(data || {}) }

  const result = { ...(data || {}) }
  let target = result

  for (let index = 0; index < keys.length - 1; index++) {
    const key = keys[index]
    target[key] = { ...(target[key] || {}) }
    target = target[key]
  }

  target[keys[keys.length - 1]] = value
  return result
}

export function evaluateCondition(data, condition) {
  if (!condition || !condition.field) return true

  const fieldValue = getPathValue(data, condition.field)
  const { op, value } = condition

  switch (op) {
    case '==': return fieldValue == value
    case '===': return fieldValue === value
    case '!=': return fieldValue != value
    case '!==': return fieldValue !== value
    case '>': return fieldValue > value
    case '<': return fieldValue < value
    case '>=': return fieldValue >= value
    case '<=': return fieldValue <= value
    case 'in': return Array.isArray(value) && value.includes(fieldValue)
    case 'notIn': return Array.isArray(value) && !value.includes(fieldValue)
    case 'empty': return fieldValue === undefined || fieldValue === null || fieldValue === ''
    case 'notEmpty': return fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
    default: return true
  }
}

export function evaluateConditions(data, conditions = [], logic = 'AND') {
  if (!Array.isArray(conditions) || conditions.length === 0) return true

  const results = conditions.map(condition => {
    if (Array.isArray(condition.conditions)) {
      return evaluateConditions(data, condition.conditions, condition.logic || 'AND')
    }

    return evaluateCondition(data, condition)
  })

  return String(logic).toUpperCase() === 'OR'
    ? results.some(Boolean)
    : results.every(Boolean)
}

export function serializeCondition(condition) {
  if (!condition || !condition.field || !condition.op) return ''
  if (condition.op === 'notEmpty') return `${condition.field} 不为空`
  if (condition.op === 'empty') return `${condition.field} 为空`
  if (Array.isArray(condition.value)) {
    return `${condition.field} ${condition.op} [${condition.value.join(', ')}]`
  }
  return `${condition.field} ${condition.op} ${condition.value ?? ''}`
}

export function serializeConditions(conditions = [], logic = 'AND') {
  return conditions
    .map(condition => {
      if (Array.isArray(condition.conditions)) {
        const nested = serializeConditions(condition.conditions, condition.logic || 'AND')
        return `(${nested})`
      }
      return serializeCondition(condition)
    })
    .filter(Boolean)
    .join(` ${String(logic).toUpperCase()} `)
}
