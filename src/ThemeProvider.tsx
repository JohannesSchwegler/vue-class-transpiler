import { MantineProvider, MantineThemeOverride } from '@mantine/core'

export const rootTheme: MantineThemeOverride = {
  globalStyles: (theme) => ({
    body: {
      background: theme.colors.gray['2']
    }
  })
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={rootTheme}>
      {children}
    </MantineProvider>
  )
}
