'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Container, Heading, Section, Text } from '@/components/ui'
import { CHILD_LABELS, HOUSEHOLD_LABELS, openShare, type Contact, type SharedPackage } from '@/lib/kit'

function Value({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-0.5">
        {(value as Contact[]).map((c, i) => (
          <li key={i}>
            {c.name}{c.relationship ? ` (${c.relationship})` : ''}{c.phone ? ` · ${c.phone}` : ''}{c.email ? ` · ${c.email}` : ''}
          </li>
        ))}
      </ul>
    )
  }
  return <span className="whitespace-pre-wrap">{String(value)}</span>
}

function Rows({ entries, labels }: { entries: Array<[string, unknown]>; labels: Record<string, string> }) {
  return (
    <dl className="divide-y divide-line border-y border-line">
      {entries.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-3 text-small sm:grid-cols-3">
          <dt className="text-muted">{labels[k] ?? k}</dt>
          <dd className="sm:col-span-2 text-ink"><Value value={v} /></dd>
        </div>
      ))}
    </dl>
  )
}

export default function SharedPackagePage() {
  const { token } = useParams<{ token: string }>()
  const [pkg, setPkg] = useState<SharedPackage | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    openShare(token).then(setPkg).catch(e => setError(e.message))
  }, [token])

  if (error) return <Container size="narrow" className="py-16"><Text tone="muted">{error}</Text></Container>
  if (!pkg) return <Container size="narrow" className="py-16"><Text tone="muted">Loading…</Text></Container>

  const household = Object.entries(pkg.household)
  return (
    <Container size="narrow" className="space-y-12 py-12 sm:py-16">
      <header>
        <Text tone="muted" variant="small" className="mb-2">Registration information</Text>
        <Heading level="h1">For {pkg.recipient}</Heading>
        <Text tone="muted" variant="small" className="mt-3">
          Shared by the family through Bunkcheck. This link expires on {new Date(pkg.expires_at).toLocaleDateString()}
          {' '}and the family can withdraw it at any time. Please copy what you need into your records.
        </Text>
      </header>
      {household.length > 0 && (
        <Section title="Household" level="h3">
          <Rows entries={household} labels={HOUSEHOLD_LABELS} />
        </Section>
      )}
      {pkg.children.map(child => {
        const { name, ...rest } = child
        return (
          <Section key={name} title={name} level="h3">
            <Rows entries={Object.entries(rest)} labels={CHILD_LABELS} />
          </Section>
        )
      })}
    </Container>
  )
}
