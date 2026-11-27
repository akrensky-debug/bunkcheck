import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Claim your listing | Bunkcheck',
  description: 'Already on Bunkcheck? Claim your camp to update sessions, pricing and contact details.',
  alternates: { canonical: '/operators/claim' },
}

export default function ClaimLayout({ children }: { children: React.ReactNode }) {
  return children
}
