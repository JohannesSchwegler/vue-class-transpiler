import { Textarea } from '@mantine/core'

export default function CodeInput(props: {
  errorMessage: string | null
  code: string
  onCodeInput: (code: string) => void
}) {
  return (
    <Textarea
      placeholder="Vue class component"
      withAsterisk
      styles={{ input: { minHeight: '500px' } }}
      value={props.code}
      onChange={(event) => props.onCodeInput(event.currentTarget.value)}
      error={props.errorMessage}
    />
  )
}
