'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button, Container, Heading, Meta, Notice, Text, TextLink } from '@/components/ui'
import { confirmAlert, getAlert, stopAlert, type AlertView } from '@/lib/alerts'
import { fmtWhen } from '@/lib/booking'

/** The page behind every registration alert email: confirm, see the date, or stop. Opening it changes nothing. */
export default function AlertPage() {
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<AlertView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getAlert(token).then(setView).catch(e => setError((e as Error).message))
  }, [token])

  async function act(fn: (t: string) => Promise<AlertView>) {
    setBusy(true)
    setError('')
    try {
      setView(await fn(token))
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

  const what = view.session_name ? `${view.camp_name} (${view.session_name})` : view.camp_name
  const campPage = `/camps/${view.camp_id}`
  const opensFuture = view.opens_at && new Date(view.opens_at).getTime() > Date.now()

  return (
    <Container size="narrow" className="space-y-8 py-16 sm:py-24">
      <header className="space-y-3">
        <Meta parts={['Registration alerts', view.email_hint]} />
        <Heading level="h1">{what}</Heading>
      </header>

      {view.status === 'pending' && (
        <div className="space-y-3">
          <p className="text-muted">
            Confirm and we&rsquo;ll email you when the registration date is announced, the day before, and when it opens.
          </p>
          <Button onClick={() => act(confirmAlert)} disabled={busy} size="lg">
            {busy ? 'Saving…' : 'Confirm alerts'}
          </Button>
        </div>
      )}

      {view.status === 'on' && (
        <div className="space-y-3">
          <Notice tone="success">
            Alerts are on. {opensFuture
              ? <>Registration opens <strong>{fmtWhen(view.opens_at!)}</strong>.</>
              : view.opens_at ? <>Registration has opened.</> : <>We&rsquo;ll email you as soon as the camp announces the date.</>}
          </Notice>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-small">
            {view.registration_url && (
              <TextLink href={view.registration_url} external>Camp&rsquo;s registration page</TextLink>
            )}
            <TextLink href={`/register/${view.camp_id}`}>Get your forms ready</TextLink>
            <TextLink href={campPage}>Camp page</TextLink>
          </div>
          <div className="border-t border-line pt-6">
            <Button variant="quiet" onClick={() => act(stopAlert)} disabled={busy}>
              Stop alerts for {view.camp_name}
            </Button>
          </div>
        </div>
      )}

      {view.status === 'stopped' && (
        <p className="text-muted">
          Alerts for {view.camp_name} are stopped. We won&rsquo;t email this address about it again. Changed your
          mind? <TextLink href={campPage}>Sign up again on the camp&rsquo;s page</TextLink>.
        </p>
      )}

      {view.status === 'expired' && (
        <p className="text-muted">
          This confirm link has expired, so no alerts were set up.{' '}
          <TextLink href={campPage}>Sign up again on the camp&rsquo;s page</TextLink>.
        </p>
      )}

      {error && <p className="text-small text-error">{error}</p>}
    </Container>
  )
}
