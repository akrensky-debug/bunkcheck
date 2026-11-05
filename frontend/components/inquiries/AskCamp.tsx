'use client'

import { useState } from 'react'
import InquiryConfirm from '@/components/inquiries/InquiryConfirm'
import { storedFamilyId } from '@/lib/agent'
import { askCamp, type InquiryView } from '@/lib/inquiries'

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
    <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
      <h2 className="font-bold text-gray-900 mb-1">Ask {campName}</h2>
      {draft?.confirm_token ? (
        <InquiryConfirm token={draft.confirm_token} initial={draft} compact />
      ) : (
        <form onSubmit={prepare} className="space-y-2">
          <label htmlFor="ask-camp" className="text-sm text-gray-600">
            A question our listing doesn&rsquo;t answer? We&rsquo;ll send it to the camp and show you their answer.
          </label>
          <textarea id="ask-camp" value={question} onChange={e => setQuestion(e.target.value)} rows={3}
            minLength={10} maxLength={1000} required placeholder="Is there a nurse on site? Can my kid join for just one week?"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
          <button type="submit" disabled={busy}
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl px-4 py-2 text-sm disabled:opacity-50">
            {busy ? 'Preparing…' : 'Review before sending'}
          </button>
          <p className="text-xs text-gray-500">You see exactly what the camp gets, and choose whether to share your contact details.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </section>
  )
}
