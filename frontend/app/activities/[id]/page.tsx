'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import TrustBadge from '@/components/TrustBadge'
import { Button, Container, EmptyState, Heading, Icon, Meta, Notice, Section, Skeleton, Text, TextLink } from '@/components/ui'
import {
  getActivity, getActivitySources, KIND_LABEL, money, PRICE_LABEL,
  type ActivityProgram, type ActivitySession, type FieldSource, type PriceOption,
} from '@/lib/activities'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function PriceList({ prices }: { prices: PriceOption[] }) {
  if (!prices.length) return null
  return (
    <ul className="space-y-0.5 text-small text-ink">
      {prices.map((p, i) => (
        <li key={i}>
          <span className="font-semibold">{money(p.amount)}</span>{' '}
          {PRICE_LABEL[p.type] ?? p.type}
          {p.audience ? ` · ${p.audience}` : ''}
          {p.covers ? ` · ${p.covers}` : ''}
          {p.notes ? <span className="text-muted"> ({p.notes})</span> : null}
        </li>
      ))}
    </ul>
  )
}

function SessionRow({ s }: { s: ActivitySession }) {
  const enrollment = s.enrollment
  return (
    <div className="flex flex-col gap-3 py-5 md:flex-row md:justify-between">
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink">{s.schedule?.summary || s.name || 'Day and time not published'}</p>
        <p className="text-small text-muted">
          {[s.skill_level, s.term, s.ages && (s.ages.min != null || s.ages.max != null) ? `Ages ${s.ages.min ?? '?'}–${s.ages.max ?? '?'}` : null]
            .filter(Boolean).join(' · ')}
        </p>
        {s.start_date && s.end_date && (
          <p className="text-small text-muted mt-1">
            {fmtDay(s.start_date)} – {fmtDay(s.end_date)}
            {s.schedule?.meeting_count ? ` · ${s.schedule.meeting_count} classes` : ''}
          </p>
        )}
        {s.schedule?.exdates?.length ? (
          <p className="text-caption text-muted">No class: {s.schedule.exdates.map(fmtDay).join(', ')}</p>
        ) : null}
        {s.location && <p className="text-caption text-muted">At {[s.location.address, s.location.city].filter(Boolean).join(', ')}</p>}
        {enrollment && (enrollment.opens || enrollment.closes) && (
          <p className="text-caption text-muted mt-1">
            Registration {enrollment.opens ? `opens ${fmtDay(enrollment.opens)}` : ''}
            {enrollment.opens && enrollment.closes ? ', ' : ''}
            {enrollment.closes ? `closes ${fmtDay(enrollment.closes)}` : ''}
          </p>
        )}
      </div>
      <div className="md:text-right space-y-2">
        <PriceList prices={s.prices} />
        {s.schedule && s.start_date && (
          <Button href={`${API}${s.calendar_url}`} variant="link" leadingIcon="calendar">Add to my calendar</Button>
        )}
      </div>
    </div>
  )
}

export default function ActivityPage() {
  const { id } = useParams<{ id: string }>()
  const [a, setA] = useState<ActivityProgram | null>(null)
  const [sources, setSources] = useState<FieldSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getActivity(id).then(setA).catch(() => setA(null)).finally(() => setLoading(false))
    getActivitySources(id).then(setSources)
  }, [id])

  if (loading) return (
    <Container className="space-y-4 py-16">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton rows={3} />
    </Container>
  )
  if (!a) return <Container><EmptyState title="Activity not found." action={<Button href="/" variant="secondary">Back to Bunkcheck</Button>} /></Container>

  const sessions = a.sessions ?? []
  const ask = `Does ${a.name}${a.provider.name ? ` at ${a.provider.name}` : ''} fit our week? Check it against our calendar.`
  const urls = Array.from(new Map(sources.filter(s => s.source_url).map(s => [s.source_url!, s])).values())

  return (
    <Container className="py-10 sm:py-14">
      <TextLink href="/" tone="muted" className="mb-10 text-small"><Icon name="arrow-left" size={14} />Back to Bunkcheck</TextLink>

      <header className="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Meta className="mb-3" parts={[KIND_LABEL[a.kind] ?? a.kind, `${a.location.city}, ${a.location.state}`]} />
          <Heading level="h1" className="mb-2">{a.name}</Heading>
          {a.provider.name && <Text tone="muted" className="mb-4">{a.provider.name}</Text>}
          <TrustBadge status={a.verification.status} />
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
          <Button href={`/?q=${encodeURIComponent(ask)}`} size="lg" icon="arrow-right">Check it fits our week</Button>
          {(a.registration_url || a.provider.website) && (
            <Button href={a.registration_url || a.provider.website!} external variant="secondary" size="lg" icon="external">
              {a.registration_url ? 'Register with the provider' : 'Provider website'}
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-narrow space-y-12">
        {(a.description || a.ages.min != null) && (
          <section className="space-y-3">
            {a.description && <Text>{a.description}</Text>}
            <Meta parts={[
              a.ages.min != null && a.ages.max != null && `Ages ${a.ages.min}–${a.ages.max}`,
              ...a.skill_levels,
              a.trial_available && `Trial class${a.trial_notes ? `: ${a.trial_notes}` : ''}`,
              a.membership_required && 'Membership required',
            ]} />
          </section>
        )}

        {a.verification.status === 'unverified' && (
          <Notice tone="warn">
            We gathered these details from the provider&rsquo;s own website and haven&rsquo;t confirmed them with the
            provider yet. Schedules and prices change by term, so check with them before you register.
            {a.verification.fields_missing.length > 0 && (
              <> Not published: {a.verification.fields_missing.map(f => f.replace('schedule.', '').replace(/_/g, ' ')).join(', ')}.</>
            )}
          </Notice>
        )}

        <Section title="Times and prices">
          {a.price.options.length > 0 && <div className="mb-2"><PriceList prices={a.price.options} /></div>}
          {sessions.length ? (
            <div className="divide-y divide-line border-y border-line">{sessions.map(s => <SessionRow key={s.id} s={s} />)}</div>
          ) : (
            <Text tone="muted" variant="small">No schedule published that we could read. Check the provider&rsquo;s site for days and times.</Text>
          )}
        </Section>

        <Section title="Contact" divided>
          <div className="space-y-1 text-small text-ink">
            {a.location.address && <p>{a.location.address}, {a.location.city}, {a.location.state}</p>}
            {a.provider.phone && <p>{a.provider.phone}</p>}
            {a.provider.email && <p>{a.provider.email}</p>}
            {a.provider.website && <p><TextLink href={a.provider.website} external>{a.provider.website}</TextLink></p>}
          </div>
        </Section>

        {urls.length > 0 && (
          <Section title="Where this came from" divided>
            <ul className="space-y-1 text-small text-muted">
              {urls.slice(0, 5).map(s => (
                <li key={s.source_url} className="break-all">
                  <a href={s.source_url!} target="_blank" rel="noopener noreferrer" className="text-ink hover:underline underline-offset-4">{s.source_url}</a>
                  {s.retrieved_on && <span> · read {fmtDay(s.retrieved_on)}</span>}
                  <span> · {sources.filter(x => x.source_url === s.source_url).length} facts</span>
                </li>
              ))}
            </ul>
            {urls.length > 5 && (
              <details className="mt-2 text-small text-muted">
                <summary className="cursor-pointer font-semibold text-ink">All {urls.length} source pages</summary>
                <ul className="mt-2 space-y-1">
                  {urls.slice(5).map(s => (
                    <li key={s.source_url} className="break-all">
                      <a href={s.source_url!} target="_blank" rel="noopener noreferrer" className="text-ink hover:underline underline-offset-4">{s.source_url}</a>
                      {s.retrieved_on && <span> · read {fmtDay(s.retrieved_on)}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Section>
        )}
      </div>
    </Container>
  )
}
