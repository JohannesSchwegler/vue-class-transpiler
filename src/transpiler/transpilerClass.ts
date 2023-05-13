import generate from '@babel/generator'
import consola from 'consola'

import { parse } from '@babel/parser'
import traverse, { TraverseOptions } from '@babel/traverse'
import * as t from '@babel/types'
import MagicString from 'magic-string'
import { processComputed, processEmits, processMethod, processProperty } from './helpers'

import {
  FunctionTemplate,
  ComputedTemplate,
  ReactiveTemplate,
  mergeProps,
  mergeEmits,
  ComposableTemplate
} from './templates'
import {
  VueComputed,
  VueFunction,
  VueReactive,
  VueProp,
  IFormatter,
  VueEmit,
  VueComposable
} from './types'
import { Visitors } from './visitors'

export interface PropTypeData {
  key: string
  type: string[]
  required: boolean
}

export type TranspilerOptions = {
  inferTypes?: boolean
  showComments?: boolean
}

export class Transpiler {
  private output: string = ''

  constructor(private formatter: IFormatter) {}

  private parseSource(source: string) {
    return parse(source, {
      sourceType: 'module',
      plugins: ['decorators-legacy', 'typescript']
    })
  }

  traverse(
    source: string,
    options: TranspilerOptions
  ): { type: 'success'; code: string } | { type: 'error'; message: string } {
    consola.info('Traversing code')
    const funcs: VueFunction[] = []
    const computeds: VueComputed[] = []
    const reactives: VueReactive[] = []
    const props: VueProp[] = []
    const emits: VueEmit[] = []
    const composables = new Set<VueComposable>()

    const propsVisitor: TraverseOptions = {
      ClassProperty(path) {
        const prop = processProperty(path)
        if (prop && prop.kind === 'Reactive') reactives.push(prop)
        if (prop && prop.kind === 'Prop') props.push(prop)
      },
      ClassMethod(path) {
        if (path.node.kind === 'method') {
          const func = processMethod(path)
          if (func) funcs.push(func)
        }
        if (path.node.kind === 'get') {
          const computed = processComputed(path)
          if (computed) computeds.push(computed)
        }
      },
      CallExpression(path) {
        const maybeEmit = processEmits(path)
        if (maybeEmit) {
          emits.push(maybeEmit)
        }
      },
      MemberExpression(path) {
        if (t.isThisExpression(path.node.object) && t.isIdentifier(path.node.property)) {
          const { name } = path.node.property
          if (name === '$router') {
            composables.add({ kind: 'Composable', funcName: 'useRouter', identifier: 'router' })
          }
        }
      }
    }
    try {
      traverse(this.parseSource(source), {
        ...propsVisitor
      })

      const result = new MagicString('')

      if (props.length > 0) {
        result.append(mergeProps(props))
        result.append('\n')
      }

      if (emits.length) {
        result.append(mergeEmits(emits))
        result.append('\n')
      }

      result.append('\n')
      result.append(
        Array.from(composables.values())
          .map((comp) => `${ComposableTemplate(comp)}`)
          .join('\n')
      )
      result.append('\n')
      result.append(reactives.map((comp) => `${ReactiveTemplate(comp, options)}`).join('\n'))
      result.append('\n')
      result.append(funcs.map((comp) => `${FunctionTemplate(comp, options)}`).join('\n'))
      result.append('\n')
      result.append(computeds.map((comp) => `${ComputedTemplate(comp, options)}`).join('\n'))

      // Remove this. calls
      const codeOutput = this.parseSource(result.toString())
      traverse(codeOutput, Visitors.updatePrefix())
      traverse(
        codeOutput,
        Visitors.updateThisExpression({
          refs: new Set(reactives.filter((r) => r.reactiveType === 'ref').map((r) => r.identifier)),
          reactives: new Set([
            ...reactives.filter((r) => r.reactiveType === 'reactive').map((r) => r.identifier),
            ...Array.from(composables.values()).map((c) => c.identifier)
          ])
        })
      )

      return { type: 'success', code: this.formatter.format(generate(codeOutput).code) }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { type: 'error', message: error.message }
      }
    }

    return { type: 'error', message: 'Unknown error' }
  }
}
