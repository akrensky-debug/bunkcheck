'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getCamp, spotsLine, type CampDetail } from '@/lib/api'
import { Events, captureAssistantArrival } from '@/lib/analytics'
import TrustBadge from '@/components/TrustBadge'
import RegistrationAlert from '@/components/booking/RegistrationAlert'
import { CAMP_TYPE_LABEL } from '@/components/CampCard'
import { Button, Container, EmptyState, Heading, Icon, Meta, Section, Skeleton, TRUST, TextLink } from '@/components/ui'

const AVAILABILITY: Record<string, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'text-checked' },
  waitlist: { label: 'Waitlist', cls: 'text-warn' },
  full: { label: 'Full', cls: 'text-error' },
  unknown: { label: 'Ask the camp', cls: 'text-muted' },
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  )
}

function sentence(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function CampDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [camp, setCamp]         = useState<CampDetail | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    captureAssistantArrival(new URLSearchParams(window.location.search))
  }, [])

  useEffect(() => {
    if (!id) return
    getCamp(id)
      .then(data => { setCamp(data); Events.campDetailViewed(data.id) })
      .catch(() => setCamp(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <Container className="space-y-4 py-16">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton rows={3} />
    </Container>
  )

  if (!camp) return (
    <Container><EmptyState title="Camp not found." action={<Button href="/search" variant="secondary">Browse camps</Button>} /></Container>
  )

  return (
    <Container className="py-10 sm:py-14">
      <TextLink href="/search" tone="muted" className="mb-10 text-small">
        <Icon name="arrow-left" size={14} />Back to results
      </TextLink>

      {/* Header */}
      <header className="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Meta className="mb-3" parts={[CAMP_TYPE_LABEL[camp.camp_type] ?? camp.camp_type, `${camp.city}, ${camp.state}`]} />
          <Heading level="h1" className="mb-4">{camp.name}</Heading>
          <TrustBadge status={camp.verification_status} aca={camp.aca_accredited} />
          {camp.trust_summary?.confirmed_by_camp_at && (
            <p className="mt-2 flex items-center gap-1.5 text-small font-semibold text-checked">
              <Icon name="check" size={14} />
              Confirmed by the camp on {new Date(camp.trust_summary.confirmed_by_camp_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {camp.last_updated_date && (
            <p className="mt-2 text-caption text-muted">
              Last updated {new Date(camp.last_updated_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Primary actions */}
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center md:flex-col md:items-stretch">
          {camp.website_url && (
            <Button
              href={camp.website_url}
              external
              icon="external"
              size="lg"
              onClick={() => Events.outboundSiteClicked(camp.id, camp.website_url!)}
            >
              Visit camp website
            </Button>
          )}
          <Button href={`/register/${camp.id}`} variant="secondary" size="lg">Get ready to register</Button>
          {camp.registration_url && (
            <Button href={camp.registration_url} external variant="link" className="self-center">Register directly</Button>
          )}
        </div>
      </header>

      <div className="grid gap-12 md:grid-cols-3 md:gap-16">
        {/* Main content */}
        <div className="space-y-12 md:col-span-2">
          {(camp.description_full || camp.description_short) && (
            <Section title="About this camp">
              <p className="max-w-measure text-body text-ink">{camp.description_full || camp.description_short}</p>
            </Section>
          )}

          {camp.sessions && camp.sessions.length > 0 && (
            <Section title="2027 sessions">
              <ul className="divide-y divide-line border-y border-line">
                {camp.sessions.map(s => {
                  const avail = AVAILABILITY[s.availability] ?? AVAILABILITY.unknown
                  return (
                    <li key={s.id} className="flex items-start justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-ink">{s.name || 'Session'}</p>
                        <p className="text-small text-muted">
                          {new Date(s.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' – '}
                          {new Date(s.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {spotsLine(s) && (
                          <p className={`text-caption ${s.spots_available === 0 ? 'text-error' : 'text-checked'}`}>{spotsLine(s)}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {s.price && <p className="text-body font-semibold text-ink">${Math.round(s.price).toLocaleString()}</p>}
                        <p className={`text-small font-semibold ${avail.cls}`}>{avail.label}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Section>
          )}

          {camp.activities && camp.activities.length > 0 && (
            <Section title="Activities">
              <p className="max-w-measure text-body text-ink">{camp.activities.map((a, i) => (i ? a : sentence(a))).join(', ')}</p>
            </Section>
          )}

          <RegistrationAlert campId={camp.id} campName={camp.name} />
        </div>

        {/* Side column */}
        <aside className="space-y-10 text-small">
          <section>
            <h2 className="mb-2 text-small font-semibold text-ink">Quick facts</h2>
            <dl className="divide-y divide-line border-y border-line">
              {camp.age_min != null && camp.age_max != null && <Fact label="Ages">{camp.age_min}–{camp.age_max}</Fact>}
              {camp.price_per_week && <Fact label="Price">${Math.round(camp.price_per_week)} a week</Fact>}
              {camp.indoor_outdoor && <Fact label="Setting">{sentence(camp.indoor_outdoor)}</Fact>}
              {camp.gender_policy && <Fact label="Gender">{sentence(camp.gender_policy)}</Fact>}
              <Fact label="Transport">{camp.transportation ? 'Yes' : 'No'}</Fact>
              <Fact label="Extended care">{camp.extended_care ? 'Yes' : 'No'}</Fact>
              <Fact label="Meals">{camp.meals_included ? 'Included' : 'No'}</Fact>
              <Fact label="Financial aid">{camp.financial_aid ? 'Available' : 'No'}</Fact>
            </dl>
          </section>

          {(camp.email || camp.phone) && (
            <section>
              <h2 className="mb-2 text-small font-semibold text-ink">Contact</h2>
              <div className="space-y-1 text-ink">
                {camp.email && <p className="break-all"><a href={`mailto:${camp.email}`} className="hover:underline underline-offset-4">{camp.email}</a></p>}
                {camp.phone && <p>{camp.phone}</p>}
              </div>
            </section>
          )}

          {camp.trust_summary && (
            <section>
              <h2 className="mb-2 text-small font-semibold text-ink">About this listing</h2>
              <div className="space-y-1 text-muted">
                <p>{(TRUST[camp.trust_summary.verification_status] ?? TRUST.unverified).label}</p>
                {camp.trust_summary.fields_verified.length > 0 && (
                  <p>{camp.trust_summary.fields_verified.length} details verified</p>
                )}
                {camp.trust_summary.fields_missing.length > 0 && (
                  <p className="text-warn">Missing: {camp.trust_summary.fields_missing.join(', ')}</p>
                )}
                {camp.trust_summary.accreditation.status === 'confirmed' && (
                  <p className="inline-flex items-center gap-1.5 font-semibold text-checked"><Icon name="check" size={14} />ACA accredited</p>
                )}
              </div>
              {camp.verification_status === 'unverified' && (
                <TextLink
                  href={`/operators/claim?camp_id=${camp.id}`}
                  className="mt-3"
                  arrow
                  onClick={() => Events.claimFlowStarted(camp.id)}
                >
                  Own this camp? Claim your listing
                </TextLink>
              )}
            </section>
          )}
        </aside>
      </div>
    </Container>
  )
}
