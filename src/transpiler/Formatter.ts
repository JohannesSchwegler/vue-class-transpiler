import prettier from 'prettier/standalone'
import prettierTS from 'prettier/esm/parser-typescript'
import { IFormatter } from './types'

export class Formatter implements IFormatter {
  format(source: string): string {
    return prettier.format(source, { plugins: [prettierTS], parser: 'typescript' })
  }
}
