'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import InquiryConfirm from '@/components/inquiries/InquiryConfirm'
import { getInquiry, type InquiryView } from '@/lib/inquiries'
import { Heading } from '@/components/ui'

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
        <Heading level="h1">{error ? 'This link no longer works' : 'Loading…'}</Heading>
      ) : (
        <>
          <header>
            <p className="text-small text-muted">
              {view.channel && view.channel !== 'Bunkcheck' ? `Prepared by ${view.channel}` : 'Your question'}
            </p>
            <Heading level="h1">A question for {view.camp.name}</Heading>
            {view.status === 'pending' && (
              <p className="text-muted mt-1">Check it reads the way you want. It goes to the camp only when you press Send.</p>
            )}
          </header>
          <InquiryConfirm token={token} initial={view} />
        </>
      )}
      {error && view === null && <p className="text-muted">{error}</p>}
    </div>
  )
}
