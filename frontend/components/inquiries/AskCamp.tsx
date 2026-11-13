'use client'

import { useState } from 'react'
import InquiryConfirm from '@/components/inquiries/InquiryConfirm'
import { storedFamilyId } from '@/lib/agent'
import { askCamp, type InquiryView } from '@/lib/inquiries'
import { Button, Heading } from '@/components/ui'

/** "Ask this camp", on a camp's page: the same inquiry flow assistants use, so there is one path. */
export default function AskCamp({ campId, campName }: { campId: string; campName: string }) {
  const [question, setQuestion] = useState('')
  const [draft, setDraft] = useState<InquiryView | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function prepare(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setDraft(await askCamp(campId, question, storedFamilyId()))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-surface rounded-lg border border-line p-6 mb-4">
      <Heading level="h3" as="h2" className="mb-1">Ask {campName}</Heading>
      {draft?.confirm_token ? (
        <InquiryConfirm token={draft.confirm_token} initial={draft} compact />
      ) : (
        <form onSubmit={prepare} className="space-y-2">
          <label htmlFor="ask-camp" className="text-small text-muted">
            A question our listing doesn&rsquo;t answer? We&rsquo;ll send it to the camp and show you their answer.
          </label>
          <textarea id="ask-camp" value={question} onChange={e => setQuestion(e.target.value)} rows={3}
            minLength={10} maxLength={1000} required placeholder="Is there a nurse on site? Can my kid join for just one week?"
            className="w-full border border-line rounded-md px-3 py-2 text-small focus:outline-none focus:border-focus" />
          <Button type="submit" disabled={busy}>
            {busy ? 'Preparing…' : 'Review before sending'}
          </Button>
          <p className="text-caption text-muted">You see exactly what the camp gets, and choose whether to share your contact details.</p>
          {error && <p className="text-small text-error">{error}</p>}
        </form>
      )}
    </section>
  )
}
