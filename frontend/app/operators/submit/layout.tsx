import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'List your camp | Bunkcheck',
  description: 'Free to submit. We review every listing and publish it within one to two business days.',
  alternates: { canonical: '/operators/submit' },
}

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return children
}
