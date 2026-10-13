'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import InquiryConfirm from '@/components/inquiries/InquiryConfirm'
import { getInquiry, type InquiryView } from '@/lib/inquiries'

/** The parent's page for a question an assistant prepared. Opening it changes nothing; Send does. */
export default function InquiryPage() {
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<InquiryView | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getInquiry(token).then(setView).catch(e => setError((e as Error).message))
  }, [token])

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      {!view ? (
        <h1 className="text-2xl font-bold text-gray-900">{error ? 'This link no longer works' : 'Loading…'}</h1>
      ) : (
        <>
          <header>
            <p className="text-sm text-gray-500">
              {view.channel && view.channel !== 'CampFinder' ? `Prepared by ${view.channel}` : 'Your question'}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">A question for {view.camp.name}</h1>
            {view.status === 'pending' && (
              <p className="text-gray-600 mt-1">Check it reads the way you want. It goes to the camp only when you press Send.</p>
            )}
          </header>
          <InquiryConfirm token={token} initial={view} />
        </>
      )}
      {error && view === null && <p className="text-gray-600">{error}</p>}
    </div>
  )
}
