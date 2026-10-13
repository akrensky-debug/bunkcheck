'use client'

import { useEffect, useState } from 'react'
import { getCampRegistration, signUpForAlerts, type CampRegistration } from '@/lib/alerts'
import { fmtWhen } from '@/lib/booking'
import { Button, Input, Notice, Section } from '@/components/ui'

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
      <p className="max-w-measure text-body text-ink">
        {isOpen
          ? <>Registration is open now.{closes ? ` It closes ${fmtWhen(reg!.closes_at!)}.` : ''}</>
          : opens && opens > now
            ? <>Registration opens <strong>{fmtWhen(reg!.opens_at!)}</strong>. Checked against the camp&rsquo;s own site.</>
            : <>We don&rsquo;t have {campName}&rsquo;s next registration date yet.</>}
      </p>

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
