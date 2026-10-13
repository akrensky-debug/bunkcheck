'use client'

import { useState } from 'react'
import { captureLead } from '@/lib/api'
import { Events } from '@/lib/analytics'

interface Props {
  hiddenCount: number
  searchContext: {
    location: string
    age?: number
    camp_type?: string
  }
  matchedCampIds: string[]
  onUnlock: () => void
}

export default function EmailGate({ hiddenCount, searchContext, matchedCampIds, onUnlock }: Props) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    Events.emailSubmitted({ location: searchContext.location, age: searchContext.age })
    try {
      await captureLead({
        parent_email: email,
        first_name: firstName || undefined,
        parent_zip: searchContext.location?.match(/\d{5}/)?.[0],
        child_age_band: searchContext.age ? ageBand(searchContext.age) : undefined,
        search_context: searchContext,
        matched_camp_ids: matchedCampIds,
        consent_flag: true,
        source: 'search_gate',
      })
      // Persist unlock in localStorage so it survives page refresh
      localStorage.setItem('cf_unlocked', '1')
      localStorage.setItem('cf_email', email)
      onUnlock()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      {/* Blurred preview cards are rendered behind this overlay by the parent */}
      <div className="bg-white border border-line rounded-2xl shadow-lift p-8 text-center max-w-md mx-auto" data-reveal>
        <div aria-hidden="true" className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-navy">
          <svg viewBox="0 0 16 16" className="h-5 w-5"><path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" pathLength={1} fill="none" stroke="#F5D96B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="check-path check-draw" /></svg>
        </div>
        <h3 className="text-xl font-bold text-navy mb-2">
          {hiddenCount} more {hiddenCount === 1 ? 'camp matches' : 'camp matches'}
        </h3>
        <p className="text-muted text-sm mb-6">
          Enter your email to unlock all results, get them sent to your inbox,
          and save your shortlist for later.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="First name (optional)"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-navy"
          />
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-navy"
          />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-lift bg-navy hover:bg-night text-white font-bold py-3 rounded-xl disabled:opacity-60"
          >
            {loading ? 'Unlocking...' : `See all ${hiddenCount + 3} matches →`}
          </button>
        </form>
        <p className="text-xs text-muted mt-3">
          No spam. Unsubscribe anytime.
        </p>
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
