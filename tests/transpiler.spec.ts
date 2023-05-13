import { describe, expect, it } from 'vitest'
import { Transpiler } from '../src/transpiler/transpilerClass'
import prettier from 'prettier'
import { Formatter } from '../src/transpiler/formatter'

describe('transform vue class component to vue 3', () => {
  it('exchanges lifecycle methods', () => {
    const source = `
    class VueClass {
    mounted(): void {}
    beforeDestroy(): void {}
    }`

    const result = prettier.format(
      `
    onMounted((): void => {});
    onBeforeUnmount((): void => {});
    `,
      { parser: 'typescript' }
    )

    const transpiler = new Transpiler(new Formatter())
    const transpilationResult = transpiler.traverse(source, {
      inferTypes: false,
      showComments: false
    })
    expect(result).toBe(
      transpilationResult.type === 'success'
        ? transpilationResult.code
        : transpilationResult.message
    )
  })
})
