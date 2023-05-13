import generate from '@babel/generator'
import * as t from '@babel/types'
import MagicString from 'magic-string'
import { VueComputed, VueProp, VueReactive, VueFunction, VueEmit, VueComposable } from './types'
import { funcExpressionToArrowFuncExpression } from './transforms'
import { TranspilerOptions } from './transpilerClass'
import { canTypeBeInfered, lifeCycleMap } from './helpers'

export function ComputedTemplate(computed: VueComputed, options: TranspilerOptions) {
  const template = new MagicString('')
  template.append(`const ${computed.identifier} = computed`)

  // Strip the returnType and add it to the computed generic
  if (computed.type) {
    let addType = true
    if (options.inferTypes && canTypeBeInfered(computed.type)) {
      addType = false
      computed.func.returnType = null
    }

    if (addType) {
      const computedType = generate(computed.type).code.replace(':', '').trim()
      template.append(`<${computedType}>`)
      computed.func.returnType = null
    }
  }
  template.append(`(${generate(computed.func).code})`)

  if (options.showComments) {
    template.prepend(generateComments(computed.comments))
  }

  return template.toString()
}

function generateCode(node: t.Node | null | undefined) {
  if (node === null || node === undefined) return node
  if (t.isTSType(node) || t.isTSTypeAnnotation(node)) {
    const { code } = generate(node)
    return code.replace(':', '').trim()
  }
  return generate(node).code
}

function generateComments(comments: null | t.Comment | t.Comment[]) {
  if (!comments) return ''
  const allComments = Array.isArray(comments) ? comments : [comments]

  return allComments?.map((c) => (c.type === 'CommentBlock' ? `/*${c.value}*/` : '//')).join('\n')
}

export function mergeProps(props: VueProp[], destructureProps = true) {
  let mergedProps = ''
  const propsWithCode = props.map((p) => ({
    ...p,
    defaultValue: generateCode(p.defaultValue),
    type: generateCode(p.type),
    validator: generateCode(p.validator)
  }))
  const withDefaults = props.filter((p) => p.defaultValue).length > 0

  const propsDef = new MagicString('defineProps<{')
  propsWithCode.forEach((prop) => {
    const isOptional = !!prop.defaultValue

    propsDef.append(`
        ${generateComments(prop.comments)}
        ${prop.identifier}${isOptional ? '?' : ''}: ${prop.type}
        `)
  })
  propsDef.append('}>()')
  mergedProps = propsDef.toString()

  if (withDefaults) {
    const tmpl = new MagicString('{')
    const propsWithDefaults = propsWithCode.filter((p) => !!p.defaultValue)
    propsWithDefaults.forEach((p, index) => {
      tmpl.append(
        `${p.identifier}:${p.defaultValue}${index !== propsWithDefaults.length - 1 ? ',' : ''}`
      )
    })
    tmpl.append('}')

    mergedProps = `withDefaults(\n${propsDef}, \n(${tmpl}))`
  }

  if (destructureProps) {
    return `
    const props = ${mergedProps}
    const { ${props.map((p) => p.identifier).join(',')} } = toRefs(props);
    `
  }

  return mergedProps
}

export function mergeEmits(emits: VueEmit[]) {
  const emitEvents = new Map<string, VueEmit>()
  for (const emit of emits) {
    if (!emitEvents.has(emit.identifier)) {
      emitEvents.set(emit.identifier, emit)
      continue
    }
  }

  return `
  const emit = defineEmits<{
    ${Array.from(emitEvents.values()).map(
      (emit) =>
        `(event: '${emit.identifier}'${
          t.isLiteral(emit.argNode) ? `,value:${inferValueType(emit.argNode)}` : ''
        }): void\n`
    )}
  }>()`
}

export function ComposableTemplate({ identifier, funcName }: VueComposable) {
  return `const ${identifier} = ${funcName}()`
}

export function ReactiveTemplate(
  { identifier, type, value, reactiveType, comments }: VueReactive,
  options: TranspilerOptions
) {
  const template = new MagicString(options.showComments ? generateComments(comments) : '')

  // Check if it's a store
  if (
    t.isCallExpression(value) &&
    t.isIdentifier(value.callee) &&
    /.*Store\b/gm.test(value.callee.name)
  ) {
    return `const ${identifier} = ${generateCode(value)}`
  }

  template.append(`const ${identifier} = ${reactiveType}`)

  // Strip the returnType and add it to the computed generic
  if (type) {
    let addType = true
    if (options.inferTypes && canTypeBeInfered(type)) {
      addType = false
    }

    if (addType) {
      const computedType = generate(type).code.replace(':', '').trim()
      template.append(`<${computedType}>`)
    }
  }
  if (value) {
    template.append(`(${generate(value).code})`)
  } else {
    template.append('()')
  }

  return template.toString()
}

export function FunctionTemplate(
  { identifier, func, isLifecycleFunction, comments }: VueFunction,
  options: TranspilerOptions
) {
  const functionCode = new MagicString('')

  if (options.inferTypes && canTypeBeInfered(func.returnType)) {
    func.returnType = null
  }

  if (isLifecycleFunction) {
    const vueThreeLifeCycleMethodName = lifeCycleMap[identifier]
    functionCode.append(
      generateCode(
        t.expressionStatement(
          t.callExpression(t.identifier(vueThreeLifeCycleMethodName), [
            funcExpressionToArrowFuncExpression(func)
          ])
        )
      ) ?? ''
    )
  } else {
    functionCode.append(generateCode(func) ?? '')
  }

  if (options.showComments) {
    functionCode.prepend(generateComments(comments))
  }

  return functionCode.toString()
}

// non-comprehensive, best-effort type infernece for a runtime value
// this is used to catch default value / type declaration mismatches
// when using props destructure.
function inferValueType(node: t.Node): string | undefined {
  switch (node.type) {
    case 'StringLiteral':
      return 'string'
    case 'NumericLiteral':
      return 'number'
    case 'BooleanLiteral':
      return 'boolean'
    case 'ObjectExpression':
      return 'object'
    case 'ArrayExpression':
      return 'Array'
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return 'Function'
  }
  return undefined
}
