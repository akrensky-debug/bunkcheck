'use client'

import { useEffect, useState } from 'react'
import { getCampRegistration, signUpForAlerts, type CampRegistration } from '@/lib/alerts'
import { fmtWhen, isSoon } from '@/lib/booking'
import { Button, Input, Notice, Section, StatusMark } from '@/components/ui'

/** "Email me when registration opens", on a camp's page. No account needed. */
export default function RegistrationAlert({ campId, campName }: { campId: string; campName: string }) {
  const [reg, setReg] = useState<CampRegistration | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getCampRegistration(campId).then(setReg).catch(() => setReg(null))
  }, [campId])

  const now = Date.now()
  const opens = reg?.verified && reg.opens_at ? new Date(reg.opens_at).getTime() : null
  const closes = reg?.closes_at ? new Date(reg.closes_at).getTime() : null
  const isOpen = opens !== null && opens <= now && (closes === null || closes > now)
  const closed = opens !== null && opens <= now && closes !== null && closes <= now

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signUpForAlerts(campId, email)
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Registration" divided>
      {isOpen ? (
        <div className="max-w-measure space-y-1">
          <StatusMark tone={isSoon(reg!.closes_at, now) ? 'caution' : 'go'} size="md">
            {isSoon(reg!.closes_at, now) ? 'Open, closing soon' : 'Open now'}
          </StatusMark>
          <p className="text-body text-ink">Registration is open now.{closes ? ` It closes ${fmtWhen(reg!.closes_at!)}.` : ''}</p>
        </div>
      ) : opens && opens > now ? (
        <div className="max-w-measure space-y-1">
          {isSoon(reg!.opens_at, now) && <StatusMark tone="caution" size="md">Opens soon</StatusMark>}
          <p className="text-body text-ink">Registration opens <strong>{fmtWhen(reg!.opens_at!)}</strong>. Checked against the camp&rsquo;s own site.</p>
        </div>
      ) : (
        <div className="max-w-measure space-y-1">
          {closed && <StatusMark tone="stop" size="md">Registration closed</StatusMark>}
          <p className="text-body text-ink">We don&rsquo;t have {campName}&rsquo;s next registration date yet.</p>
        </div>
      )}

      {!isOpen && (sent ? (
        <Notice tone="success" className="mt-4 max-w-measure">
          Check your email for a link to confirm. Nothing else comes until you click it.
        </Notice>
      ) : (
        <form onSubmit={submit} className="mt-5 max-w-narrow space-y-2">
          <label htmlFor="alert-email" className="text-small font-semibold text-ink">
            Email me when registration opens
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="alert-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" className="flex-1" />
            <Button type="submit" disabled={busy} size="lg">
              {busy ? 'Sending…' : 'Tell me'}
            </Button>
          </div>
          <p className="text-caption text-muted">
            No account. We email when the date is announced, the day before, and when it opens. One click stops it.
          </p>
          {error && <p className="text-small text-error">{error}</p>}
        </form>
      ))}

      {reg && reg.alerts_waiting > 1 && (
        <p className="mt-4 text-caption text-muted">
          {reg.alerts_waiting} families are waiting to hear when registration opens.
        </p>
      )}
    </Section>
  )
}
