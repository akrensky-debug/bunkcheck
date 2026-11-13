import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from 'next'
import { Container, Heading, List, ListRow, Notice, Section, Stack, Text, TextLink } from '@/components/ui'
import { CONNECTOR_URL } from '@/lib/site'
import { CopyAddress } from './CopyAddress'

export const metadata: Metadata = {
  title: 'Use Bunkcheck in Claude | Bunkcheck',
  description: 'Add Bunkcheck to Claude in three steps, then ask about summer camps in your own words.',
}

// Steps checked against Claude's help article "Get started with custom connectors using remote
// MCP" on 13 November 2026. A screenshot shows under its step once the PNG is in
// public/connect/ (step-1.png, step-2.png, step-3.png).
const STEPS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: 'Open Connectors in Claude',
    body: (
      <>
        In Claude, go to <strong>Customize</strong>, then <strong>Connectors</strong>. Click{' '}
        <strong>Add</strong>, then <strong>Add custom connector</strong>.{' '}
        <TextLink href="https://claude.ai/customize/connectors" external>Open Connectors in Claude</TextLink>
      </>
    ),
  },
  {
    title: 'Name it Bunkcheck and paste the address',
    body: <>Type <strong>Bunkcheck</strong> as the name, paste the address above, and click <strong>Continue</strong>.</>,
  },
  {
    title: 'Choose No sign in, then Add',
    body: (
      <>
        Bunkcheck needs no account. Pick <strong>No sign in</strong> and click <strong>Add</strong>. In a
        new chat, check it is on under the <strong>+</strong> button, then <strong>Connectors</strong>.
      </>
    ),
  },
]

const PROMPTS = [
  'Find day camps near Providence for my 8-year-old who loves science.',
  'Which Boston day camps have extended care for under $400 a week?',
  'What camps still have openings the week of July 5 near Cranston, RI?',
]

function screenshot(step: number): string | null {
  const file = `/connect/step-${step}.png`
  return existsSync(join(process.cwd(), 'public', file)) ? file : null
}

export default function ConnectPage() {
  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <Stack gap={12}>
        <Stack gap={3}>
          <Heading level="h1">Use Bunkcheck in Claude</Heading>
          <Text variant="lead" tone="muted">
            Ask Claude about summer camps and get Bunkcheck&apos;s camp cards right in the chat: dates,
            weekly prices, extended care and open weeks.
          </Text>
        </Stack>

        <Section title="Your Bunkcheck address">
          <CopyAddress address={CONNECTOR_URL} />
          <Text variant="small" tone="muted" className="mt-3">
            Works with any assistant that accepts a remote MCP connector, not only Claude.
          </Text>
        </Section>

        <Section title="Add it to Claude" divided>
          <ol className="space-y-8">
            {STEPS.map((step, i) => {
              const img = screenshot(i + 1)
              return (
                <li key={step.title}>
                  <Stack gap={2}>
                    <Heading level="h3">{i + 1}. {step.title}</Heading>
                    <Text>{step.body}</Text>
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={`Claude, step ${i + 1}: ${step.title}`} className="mt-2 w-full rounded-md border border-line" />
                    )}
                  </Stack>
                </li>
              )
            })}
          </ol>
          <Text variant="small" tone="muted" className="mt-8">
            Works on every Claude plan, on the web, desktop and phone. The Free plan allows one custom
            connector. On a Team or Enterprise plan, an owner adds Bunkcheck for the organization first,
            under Organization settings, then Connectors.
          </Text>
        </Section>

        <Section title="Then ask" description="Click one to open it in Claude, or type your own town and your kids' ages." divided>
          <List flush>
            {PROMPTS.map(p => (
              // Opens a new Claude chat with the prompt filled in; the parent presses send.
              <ListRow key={p} density="compact" href={`https://claude.ai/new?q=${encodeURIComponent(p)}`} external>
                <Text>&ldquo;{p}&rdquo;</Text>
              </ListRow>
            ))}
          </List>
        </Section>

        <Section title="ChatGPT" divided>
          <Text>
            Coming soon. Bunkcheck is waiting for OpenAI&apos;s review. Once it&apos;s approved, you&apos;ll find
            it in ChatGPT&apos;s apps, with nothing to paste.
          </Text>
        </Section>

        <Notice tone="info">
          The connection sees only public camp facts and the search details your assistant sends, like a
          town and an age. It never sees your family&apos;s information or your conversation.{' '}
          <TextLink href="/privacy">Privacy policy</TextLink>
        </Notice>
      </Stack>
    </Container>
  )
}
