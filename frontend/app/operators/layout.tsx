import type { Metadata } from 'next'

// The pages under /operators are client components, which can't set their own title.
export const metadata: Metadata = {
  title: 'For camps | Bunkcheck',
  description: 'Parents plan their summer with Bunkcheck on the web, in ChatGPT and in Claude. List your camp for free, or claim your listing to update sessions and pricing.',
  alternates: { canonical: '/operators' },
}

export default function OperatorsLayout({ children }: { children: React.ReactNode }) {
  return children
}
