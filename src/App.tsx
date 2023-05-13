import { Prism } from '@mantine/prism'
import { Buffer } from 'buffer'
import duotoneLight from 'prism-react-renderer/themes/vsLight'
import { useEffect, useMemo, useState } from 'react'
import { Checkbox } from '@mantine/core'
import CodeInput from './CodeInput'
import Layout from './Layout'
import { ThemeProvider } from './ThemeProvider'
import VueIcon from './components/IconVue'
import { Transpiler, TranspilerOptions } from './transpiler/transpilerClass'
import { Formatter } from './transpiler/formatter'

// @ts-ignore
window.Buffer = Buffer

const vueClass = `
export default class Counter extends Vue {
	count = 0
  
	increment() {
	  this.count++
	}
  
	decrement() {
	  this.count--
	}
}
`

const formatter = new Formatter()

export default function App() {
  const [currentCode, setCurrentCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [transpiledCode, setTranspiledCode] = useState<string | null>('')
  const [activeOptions, setActiveOptions] = useState<(keyof TranspilerOptions)[]>([])

  const options = useMemo(() => {
    const ops: TranspilerOptions = { inferTypes: false, showComments: false }
    activeOptions.forEach((key) => (ops[key] = true))
    return ops
  }, [activeOptions])

  useEffect(() => setCurrentCode(vueClass), [])

  useEffect(() => {
    try {
      const result = new Transpiler(formatter).traverse(currentCode, options)
      if (result.type === 'success') {
        setTranspiledCode(result.code)
        setErrorMessage(null)
      }
      if (result.type === 'error') {
        setErrorMessage(result.message)
      }
    } catch (error: unknown) {}
  }, [currentCode, options])

  return (
    <ThemeProvider>
      {errorMessage}sdf
      <Layout
        sidebar={
          <>
            <Checkbox.Group
              value={activeOptions}
              onChange={(values: (keyof TranspilerOptions)[]) => setActiveOptions(values)}
            >
              <Checkbox value="inferTypes" label="Infer Types" />
              <Checkbox value="showComments" label="Show comments" />
            </Checkbox.Group>
            <CodeInput
              errorMessage={errorMessage}
              code={currentCode}
              onCodeInput={setCurrentCode}
            />
          </>
        }
      >
        {transpiledCode !== null && (
          <Prism.Tabs defaultValue="setup.vue">
            <Prism.TabsList>
              <Prism.Tab value="setup.vue" icon={<VueIcon width="1rem" height="1rem" />}>
                Setup API
              </Prism.Tab>
            </Prism.TabsList>

            <Prism.Panel
              language="tsx"
              value="setup.vue"
              getPrismTheme={() => duotoneLight}
              withLineNumbers
            >
              {transpiledCode}
            </Prism.Panel>
          </Prism.Tabs>
        )}
      </Layout>
    </ThemeProvider>
  )
}
