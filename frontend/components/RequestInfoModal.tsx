'use client'

import { useState } from 'react'
import { captureLead } from '@/lib/api'
import { Events } from '@/lib/analytics'

interface Props {
  campId: string
  campName: string
  onClose: () => void
}

export default function RequestInfoModal({ campId, campName, onClose }: Props) {
  const [email, setEmail]     = useState(typeof window !== 'undefined' ? localStorage.getItem('cf_email') || '' : '')
  const [firstName, setFirst] = useState('')
  const [message, setMessage] = useState('')
  const [age, setAge]         = useState('')
  const [done, setDone]       = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    Events.requestInfoClicked(campId)
    try {
      await captureLead({
        parent_email:    email,
        first_name:      firstName || undefined,
        target_camp_id:  campId,
        child_age_band:  age ? ageBand(Number(age)) : undefined,
        message:         message || undefined,
        consent_flag:    true,
        source:          'camp_detail',
        matched_camp_ids: [campId],
        search_context:  { camp_id: campId },
      })
      localStorage.setItem('cf_email', email)
      setDone(true)
    } catch {
      // fail silently for now
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-night/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-rise-in" onClick={e => e.stopPropagation()}>
        {done ? (
          <div className="text-center py-4">
            <div aria-hidden="true" className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-checked-soft">
              <svg viewBox="0 0 16 16" className="h-7 w-7"><path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" pathLength={1} fill="none" stroke="#2E6B3F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="check-path check-draw" /></svg>
            </div>
            <h3 className="text-lg font-bold mb-1">Request sent!</h3>
            <p className="text-sm text-gray-500">
              We've logged your interest in <strong>{campName}</strong>. The camp will be in touch, or we'll follow up with more info.
            </p>
            <button onClick={onClose} className="mt-4 text-sm font-semibold text-navy underline">Close</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Request info from camp</h3>
                <p className="text-sm text-gray-500">{campName}</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="text-muted hover:text-navy text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Your first name"
                value={firstName}
                onChange={e => setFirst(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-navy"
              />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-navy"
              />
              <input
                type="number"
                placeholder="Child's age (optional)"
                value={age}
                onChange={e => setAge(e.target.value)}
                min={3} max={18}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-navy"
              />
              <textarea
                placeholder="Any questions or notes? (optional)"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-navy resize-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-lift bg-navy hover:bg-night text-white font-bold py-3 rounded-xl disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send request →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function ageBand(age: number): string {
  if (age <= 5)  return '3-5'
  if (age <= 8)  return '6-8'
  if (age <= 11) return '9-11'
  if (age <= 14) return '12-14'
  return '15+'
}
