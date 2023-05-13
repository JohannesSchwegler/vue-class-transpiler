import { AppShell, Title, Navbar, Header } from '@mantine/core'
import { ReactNode } from 'react'

export default function Layout(props: React.PropsWithChildren & { sidebar: ReactNode }) {
  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 500 }} p="xl">
          {props.sidebar}
        </Navbar>
      }
      header={
        <Header height={60} p="xs">
          <Title order={3}>Vue class compiler</Title>
        </Header>
      }
    >
      {props.children}
    </AppShell>
  )
}
