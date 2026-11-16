'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button, Container, Field, Heading, Notice, Section, Text, Textarea } from '@/components/ui'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface View {
  camp_name: string | null
  from_email: string
  subject: string | null
  received_at: string | null
  body: string
  status: string
  reason: string | null
  lines: string[]
  can_apply: boolean
  handled_by: string | null
  handled_at: string | null
}

/** A reason as the end of a sentence: one period, never two. */
function tail(reason: string | null) {
  return reason ? `: ${reason.trim().replace(/[.!?]+$/, '')}.` : '.'
}

function when(ts: string | null) {
  if (!ts) return ''
  return new Date(ts).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * The page behind the link in a forwarded owner email (campfinder/owners/inbound.py). It shows
 * the email and what the listing reader proposes. Opening it changes nothing; the buttons do.
 * Not linked from anywhere else; the link is the key.
 */
export default function ReviewOwnerEmailPage() {
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<View | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    fetch(`${API}/api/v1/owners/review/${token}`, { cache: 'no-store' })
      .then(async r => (r.ok ? setView(await r.json()) : setError((await r.json().catch(() => ({}))).detail || 'This review link has expired.')))
      .catch(() => setError('We could not load this page. Please try again.'))
  }, [token])

  async function act(action: 'apply' | 'reject') {
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`${API}/api/v1/owners/review/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' ? { action, reason } : { action }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.detail || 'Something went wrong.')
      setView(body)
      setClosing(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!view) {
    return (
      <Container size="narrow" className="space-y-3 py-16 sm:py-24">
        <Heading level="h1">{error ? 'This link no longer works' : 'Loading…'}</Heading>
        {error && <Text tone="muted">{error}</Text>}
      </Container>
    )
  }

  const open = view.status === 'proposed' || view.status === 'needs_person'

  return (
    <Container size="narrow" className="space-y-10 py-16 sm:py-24">
      <header className="space-y-3">
        <Text tone="muted" variant="small">An owner&rsquo;s email to Bunkcheck</Text>
        <Heading level="h1">{view.camp_name ?? view.from_email}</Heading>
        <Text tone="muted">From {view.from_email}{view.received_at ? ` · ${when(view.received_at)}` : ''}</Text>
      </header>

      {view.status === 'applied' && (
        <Notice tone="success">Applied{view.handled_at ? ` ${when(view.handled_at)}` : ''}. The owner was emailed what changed.</Notice>
      )}
      {view.status === 'asked' && (
        <Notice tone="success">Applied. The owner was emailed what changed and asked to check the dates.</Notice>
      )}
      {view.status === 'rejected' && (
        <Notice tone="info">Closed without changes{tail(view.reason)}</Notice>
      )}
      {view.status === 'needs_person' && (
        <Notice tone="warn">Nothing was changed. A person should read this{tail(view.reason)}</Notice>
      )}

      {view.lines.length > 0 && (
        <Section title={view.status === 'proposed' ? 'What applying changes' : 'What the reader proposed'}>
          <ul className="space-y-2 border-y border-line py-4 text-small text-ink">
            {view.lines.map((l, i) => <li key={i} className="whitespace-pre-wrap">{l}</li>)}
          </ul>
        </Section>
      )}

      <Section title="Their email" description={view.subject ?? undefined}>
        <Text wide className="whitespace-pre-wrap break-words">{view.body}</Text>
      </Section>

      {open && (
        <div className="space-y-4 border-t border-line pt-8">
          {view.can_apply && !closing && (
            <>
              <Button onClick={() => act('apply')} disabled={busy} size="lg" block>
                {busy ? 'Applying…' : 'Apply and tell the owner'}
              </Button>
              <Text tone="muted" variant="small">
                The listing changes now and the owner gets an email showing each change, with a way to reply if it&rsquo;s wrong.
              </Text>
            </>
          )}
          {closing ? (
            <div className="space-y-3">
              <Field label="Why close it" hint="For the change log. The owner isn't emailed." optional>
                {id => <Textarea id={id} rows={3} value={reason} onChange={e => setReason(e.target.value)} />}
              </Field>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => act('reject')} disabled={busy}>{busy ? 'Closing…' : 'Close without changes'}</Button>
                <Button variant="quiet" onClick={() => setClosing(false)} disabled={busy}>Back</Button>
              </div>
            </div>
          ) : (
            <Button variant="quiet" onClick={() => setClosing(true)} disabled={busy}>
              {view.can_apply ? 'Close without changes' : 'Close it, I handled it'}
            </Button>
          )}
        </div>
      )}
      {error && <Text tone="error" variant="small">{error}</Text>}
    </Container>
  )
}
