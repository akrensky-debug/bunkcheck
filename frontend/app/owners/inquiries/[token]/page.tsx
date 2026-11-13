'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fmtWhen, getCampInquiry, replyToInquiry, type CampInquiryView } from '@/lib/inquiries'
import { Button, Heading, TextLink } from '@/components/ui'

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** The camp's page behind an inquiry email: the question, an answer box, and its recent inquiries. */
export default function CampInquiryPage() {
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<CampInquiryView | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getCampInquiry(token).then(setView).catch(e => setError((e as Error).message))
  }, [token])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setView(await replyToInquiry(token, text))
      setText('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!view) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Heading level="h1">{error ? 'This link no longer works' : 'Loading…'}</Heading>
        {error && <p className="text-muted mt-2">{error}</p>}
      </div>
    )
  }

  const q = view.inquiry
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <header>
        <p className="text-small text-muted">{view.camp.name} · questions from parents</p>
        <Heading level="h1">A parent&rsquo;s question</Heading>
        <p className="text-small text-muted mt-1">
          Sent through {q.source}{q.delivered_at ? `, ${fmtWhen(q.delivered_at)}` : ''}
          {q.session ? ` · about ${q.session.name ?? 'a session'}, ${fmtDate(q.session.start_date)} – ${fmtDate(q.session.end_date)}` : ''}
        </p>
      </header>

      <section className="border border-line rounded-lg p-5 space-y-3">
        <p className="text-ink whitespace-pre-wrap">{q.question ?? 'This question was removed after a year, as we promise parents.'}</p>
        {q.kit_url && (
          <p className="text-small"><TextLink href={q.kit_url} external>Open the family&rsquo;s info package</TextLink> (every open is logged)</p>
        )}
        <p className="text-small text-muted">
          {q.contact
            ? <>They shared: {[q.contact.name, q.contact.email, q.contact.phone].filter(Boolean).join(', ')}</>
            : 'They did not share contact details. Your answer reaches them through Bunkcheck.'}
        </p>
      </section>

      {q.replies.map((r, i) => (
        <div key={i} className="bg-tint border border-line rounded-md px-4 py-3">
          <p className="text-caption text-muted mb-1">Your answer · {fmtWhen(r.at)}</p>
          <p className="text-small text-ink whitespace-pre-wrap">{r.text}</p>
        </div>
      ))}

      <form onSubmit={send} className="space-y-2">
        <label htmlFor="answer" className="text-small font-medium text-ink">{q.replies.length ? 'Add to your answer' : 'Your answer'}</label>
        <textarea id="answer" value={text} onChange={e => setText(e.target.value)} rows={5} required maxLength={5000}
          className="w-full border border-line rounded-md px-3 py-2 text-small focus:outline-none focus:border-focus" />
        <Button type="submit" disabled={busy || !text.trim()}>
          {busy ? 'Sending…' : 'Send answer'}
        </Button>
        <p className="text-caption text-muted">You can also just reply to the email.</p>
        {error && <p className="text-small text-error">{error}</p>}
      </form>

      <section className="pt-4 border-t border-line space-y-3">
        <Heading level="h3" as="h2">Recent questions</Heading>
        <p className="text-small text-muted">
          AI assistants showed {view.camp.name} in their results {view.agent_appearances_30_days} time
          {view.agent_appearances_30_days === 1 ? '' : 's'} in the last 30 days.
        </p>
        <ul className="divide-y divide-line text-small">
          {view.inquiries.map(i => (
            <li key={i.id} className="py-2 flex gap-3">
              <span className="text-muted w-24 shrink-0">{i.delivered_at ? fmtWhen(i.delivered_at).split(',')[0] : ''}</span>
              <span className="text-muted w-32 shrink-0">{i.source}</span>
              <span className="text-ink min-w-0 truncate">{i.question ?? '(removed)'}</span>
              <span className="ml-auto text-muted shrink-0">{i.answered ? 'Answered' : 'Open'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
