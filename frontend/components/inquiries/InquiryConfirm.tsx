'use client'

import { useState } from 'react'
import { cancelInquiry, fmtWhen, sendInquiry, type InquiryView } from '@/lib/inquiries'
import { Button } from '@/components/ui'

/**
 * The parent's yes. Shows exactly what the camp will read, lets them add contact details if
 * they want the camp to have them, and sends only when they press Send. Used on the confirm
 * page, in the agent's card, and under "Ask this camp".
 */
export default function InquiryConfirm({ token, initial, compact = false }: {
  token: string
  initial: InquiryView
  compact?: boolean
}) {
  const [view, setView] = useState(initial)
  const [share, setShare] = useState(false)
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function act(fn: () => Promise<InquiryView>) {
    setBusy(true)
    setError('')
    try {
      setView(await fn())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const camp = view.camp.name ?? 'the camp'

  if (view.status !== 'pending') {
    return (
      <div className={`${compact ? '' : 'space-y-4'}`}>
        <p className={`text-small rounded-md px-4 py-3 border ${view.status === 'delivered' || view.status === 'confirmed'
          ? 'bg-checked-soft border-checked text-checked' : 'bg-tint border-line text-ink'}`}>
          {view.status === 'delivered' ? `Sent to ${camp}. Their answer will show here.` : view.status_text}
        </p>
        {view.status === 'delivered' && (
          <p className="text-caption text-muted mt-2">
            {view.contact_included
              ? `You shared your contact details with ${camp}, so they may also reach you directly.`
              : `You didn't share contact details. ${camp} answers here.`}
          </p>
        )}
        {view.replies.length > 0 && (
          <div className="mt-3 space-y-2">
            {view.replies.map((r, i) => (
              <div key={i} className="bg-surface border border-line rounded-md px-4 py-3">
                <p className="text-caption text-muted mb-1">{camp} · {fmtWhen(r.at)}</p>
                <p className="text-small text-ink whitespace-pre-wrap">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const field = (key: 'name' | 'email' | 'phone', label: string, type = 'text') => (
    <input type={type} value={contact[key]} placeholder={label} aria-label={label}
      autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : 'tel'}
      onChange={e => setContact({ ...contact, [key]: e.target.value })}
      className="w-full border border-line rounded-md px-3 py-2 text-small focus:outline-none focus:border-focus" />
  )

  return (
    <div className="space-y-4">
      <div>
        <p className="text-small font-medium text-ink mb-1">What {camp} will read</p>
        <pre className="whitespace-pre-wrap font-sans text-small text-ink bg-tint border border-line rounded-md p-4">
          {view.preview?.text}
        </pre>
        {view.kit && (
          <p className="text-caption text-muted mt-1">
            Your info package link shares {view.kit.summary}. It expires {view.kit.expires_on}; you can withdraw it on the
            Register page.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-2 text-small text-ink">
          <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} className="mt-1" />
          <span>Share how to reach me with {camp}. Otherwise they answer through Bunkcheck and see no contact details.</span>
        </label>
        {share && (
          <div className="grid gap-2 sm:grid-cols-3">
            {field('name', 'Your name')}
            {field('email', 'Email', 'email')}
            {field('phone', 'Phone', 'tel')}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy} onClick={() => act(() => sendInquiry(token, share ? contact : null))}>
          {busy ? 'Sending…' : `Send to ${camp}`}
        </Button>
        <Button variant="quiet" disabled={busy} onClick={() => act(() => cancelInquiry(token))}>
          Don&rsquo;t send
        </Button>
      </div>
      <p className="text-caption text-muted">Nothing has been sent yet.{view.expires_at ? ` This waits for you until ${fmtWhen(view.expires_at)}.` : ''}</p>
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  )
}
