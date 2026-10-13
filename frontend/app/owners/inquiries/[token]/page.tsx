'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fmtWhen, getCampInquiry, replyToInquiry, type CampInquiryView } from '@/lib/inquiries'

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
        <h1 className="text-2xl font-bold text-gray-900">{error ? 'This link no longer works' : 'Loading…'}</h1>
        {error && <p className="text-gray-600 mt-2">{error}</p>}
      </div>
    )
  }

  const q = view.inquiry
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <header>
        <p className="text-sm text-gray-500">{view.camp.name} · questions from parents</p>
        <h1 className="text-2xl font-bold text-gray-900">A parent&rsquo;s question</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sent through {q.source}{q.delivered_at ? `, ${fmtWhen(q.delivered_at)}` : ''}
          {q.session ? ` · about ${q.session.name ?? 'a session'}, ${fmtDate(q.session.start_date)} – ${fmtDate(q.session.end_date)}` : ''}
        </p>
      </header>

      <section className="border border-gray-200 rounded-2xl p-5 space-y-3">
        <p className="text-gray-900 whitespace-pre-wrap">{q.question ?? 'This question was removed after a year, as we promise parents.'}</p>
        {q.kit_url && (
          <p className="text-sm"><a href={q.kit_url} className="text-brand-700 underline">Open the family&rsquo;s info package</a> (every open is logged)</p>
        )}
        <p className="text-sm text-gray-600">
          {q.contact
            ? <>They shared: {[q.contact.name, q.contact.email, q.contact.phone].filter(Boolean).join(', ')}</>
            : 'They did not share contact details. Your answer reaches them through CampFinder.'}
        </p>
      </section>

      {q.replies.map((r, i) => (
        <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Your answer · {fmtWhen(r.at)}</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.text}</p>
        </div>
      ))}

      <form onSubmit={send} className="space-y-2">
        <label htmlFor="answer" className="text-sm font-medium text-gray-700">{q.replies.length ? 'Add to your answer' : 'Your answer'}</label>
        <textarea id="answer" value={text} onChange={e => setText(e.target.value)} rows={5} required maxLength={5000}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
        <button type="submit" disabled={busy || !text.trim()}
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl px-5 py-2.5 text-sm disabled:opacity-50">
          {busy ? 'Sending…' : 'Send answer'}
        </button>
        <p className="text-xs text-gray-500">You can also just reply to the email.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <section className="pt-4 border-t border-gray-100 space-y-3">
        <h2 className="font-bold text-gray-900">Recent questions</h2>
        <p className="text-sm text-gray-600">
          AI assistants showed {view.camp.name} in their results {view.agent_appearances_30_days} time
          {view.agent_appearances_30_days === 1 ? '' : 's'} in the last 30 days.
        </p>
        <ul className="divide-y divide-gray-100 text-sm">
          {view.inquiries.map(i => (
            <li key={i.id} className="py-2 flex gap-3">
              <span className="text-gray-500 w-24 shrink-0">{i.delivered_at ? fmtWhen(i.delivered_at).split(',')[0] : ''}</span>
              <span className="text-gray-500 w-32 shrink-0">{i.source}</span>
              <span className="text-gray-800 min-w-0 truncate">{i.question ?? '(removed)'}</span>
              <span className="ml-auto text-gray-400 shrink-0">{i.answered ? 'Answered' : 'Open'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
