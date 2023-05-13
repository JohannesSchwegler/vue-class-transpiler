import { NodePath } from '@babel/traverse'
import * as t from '@babel/types'
import { ExtractArrayType, VueComputed, VueEmit, VueFunction, VueProp, VueReactive } from './types'

export const lifeCycleMap: Record<string, string> = {
  beforeCreate: 'onBeforeMount',
  created: 'onBeforeMount',
  beforeMount: 'onBeforeMount',
  mounted: 'onMounted',
  beforeDestroy: 'onBeforeUnmount',
  destroyed: 'onUnmounted',
  activated: 'onActivated',
  deactivated: 'onDeactivated'
} as const

export function canTypeBeInfered(
  node: t.TypeAnnotation | t.TSTypeAnnotation | t.Noop | null | undefined
) {
  if (!node) return true
  if (t.isTSTypeAnnotation(node) && t.isTSBaseType(node.typeAnnotation)) return true
  return false
}

export function processProperty(rootPath: NodePath<t.ClassProperty>): VueReactive | VueProp | null {
  const decorators = rootPath.node.decorators ?? []
  if (decorators.length === 0) return processReactive(rootPath)

  // Todo: Refactor visitor outside of this func
  let value: VueReactive | VueProp | null = null
  rootPath.traverse({
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: 'Prop' })) value = processProp(rootPath)
    }
  })

  return value
}

export function processMethod(path: NodePath<t.ClassMethod>): VueFunction | null {
  if (t.isIdentifier(path.node.key)) {
    const params = path.node.params.filter((p) => !t.isTSParameterProperty(p)) as Exclude<
      ExtractArrayType<t.ClassMethod['params']>,
      t.TSParameterProperty
    >[]

    const methodName = path.node.key.name

    const func = t.functionExpression(
      path.node.key,
      params,
      path.node.body,
      path.node.generator,
      path.node.async
    )
    func.returnType = path.node.returnType

    let isLifecycle = false
    if (methodName in lifeCycleMap) {
      isLifecycle = true
    }

    return {
      identifier: methodName,
      func,
      kind: 'Function',
      isLifecycleFunction: isLifecycle,
      comments: path.node.leadingComments ?? null
    }
  }
  return null
}

export function processEmits(path: NodePath<t.CallExpression>): VueEmit | null {
  const { callee } = path.node
  if (
    (t.isMemberExpression(callee) &&
      t.isThisExpression(callee.object) &&
      t.isIdentifier(callee.property) &&
      callee.property.name === '$emit') ||
    (t.isIdentifier(callee) && callee.name === 'emit')
  ) {
    // Get Args
    const args = path.node.arguments
    if (args.length && t.isStringLiteral(args[0])) {
      return { identifier: args[0].value, kind: 'Emit', argNode: args.length > 1 ? args[1] : null }
    }
  }

  return null
}

export function processComputed(path: NodePath<t.ClassMethod>): VueComputed | null {
  if (t.isIdentifier(path.node.key)) {
    const params = path.node.params.filter(
      (p): p is Exclude<typeof p, t.TSParameterProperty> => !t.isTSParameterProperty(p)
    )

    const func = t.arrowFunctionExpression(params, path.node.body, path.node.async)
    func.returnType = path.node.returnType

    return {
      kind: 'Computed',
      identifier: path.node.key.name,
      func,
      type: func.returnType,
      comments: path.node.leadingComments ?? null
    }
  }
  return null
}

export function processReactive(path: NodePath<t.ClassProperty>): VueReactive | null {
  let name: string | null = null
  let value: t.Expression | null | undefined = null
  let type: t.ClassProperty['typeAnnotation'] | null = null

  if (t.isIdentifier(path.node.key)) {
    name = path.node.key.name
  }

  type = path.node.typeAnnotation
  value = path.node.value

  if (name) {
    return {
      kind: 'Reactive',
      identifier: name,
      reactiveType: t.isObjectExpression(value) ? 'reactive' : 'ref',
      value,
      type,
      comments: path.node.leadingComments ?? null
    }
  }

  return null
}
type PropDecorator = t.ArrayExpression | t.ObjectExpression | t.Identifier | null

export function processProp(path: NodePath<t.ClassProperty>): VueProp | null {
  let propDecorator = null as PropDecorator
  path.traverse({
    CallExpression(path) {
      const args = path.node.arguments
      if (args.length > 1) throw Error('Decorator can only contain one argument')

      const decoratorArg = args[0]
      /*
            // ArrayExpression, e.g. [String, Number]
            // Identifier, e.g. Number
            // ObjectExpression, e.g. { default: '' };
            */
      if (
        t.isArrayExpression(decoratorArg) ||
        t.isObjectExpression(decoratorArg) ||
        t.isIdentifier(decoratorArg)
      ) {
        propDecorator = decoratorArg
      }
    }
  })

  let name: string = ''
  let type: VueProp['type'] | null = null
  const required: VueProp['required'] = false
  let defaultValue: VueProp['defaultValue'] | null = null
  let validator: VueProp['validator'] | null = null

  // process decorator
  if (t.isObjectExpression(propDecorator)) {
    for (const prop of propDecorator.properties.filter(
      (p): p is t.ObjectProperty | t.ObjectMethod => t.isObjectProperty(p) || t.isObjectMethod(p)
    )) {
      if (t.isObjectMethod(prop) && t.isIdentifier(prop.key, { name: 'validator' })) {
        validator = prop
        continue
      }

      if (t.isObjectProperty(prop)) {
        // Validator
        if (t.isIdentifier(prop.key, { name: 'validator' }) && t.isFunctionExpression(prop.value))
          validator = prop.value

        // Default
        if (t.isIdentifier(prop.key, { name: 'default' })) defaultValue = prop.value
      }
    }
  }

  if (t.isIdentifier(path.node.key)) {
    name = path.node.key.name
  }

  type = path.node.typeAnnotation

  return {
    identifier: name,
    kind: 'Prop',
    defaultValue,
    required,
    type,
    validator,
    comments: path.node.leadingComments ?? null
  }
}
