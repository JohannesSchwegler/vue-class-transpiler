import * as t from '@babel/types'

export type ExtractArrayType<T extends any[]> = T extends (infer U)[] ? U : never

export type VueComposable = {
  kind: 'Composable'
  identifier: string
  funcName: string
}

export type VueProp = {
  kind: 'Prop'
  identifier: string
  type: t.ClassProperty['typeAnnotation']
  required: boolean
  defaultValue: t.ObjectProperty['value'] | null
  validator: t.FunctionExpression | t.ObjectMethod | null
  comments: t.Comment[] | null
}
export type VueEmit = {
  kind: 'Emit'
  identifier: string
  argNode: ExtractArrayType<t.CallExpression['arguments']> | null
}

export type VueReactive = {
  kind: 'Reactive'
  identifier: string
  reactiveType: 'ref' | 'reactive'
  type: t.ClassProperty['typeAnnotation']
  value: t.ClassProperty['value']
  comments: t.Comment[] | null
}
export type VueFunction = {
  kind: 'Function'
  identifier: string
  func: t.FunctionExpression
  isLifecycleFunction: boolean
  comments: t.Comment[] | null
}
export type VueComputed = {
  kind: 'Computed'
  identifier: string
  type: t.ArrowFunctionExpression['returnType']
  func: t.ArrowFunctionExpression
  comments: t.Comment[] | null
}

export interface IFormatter {
  format(source: string): string
}
