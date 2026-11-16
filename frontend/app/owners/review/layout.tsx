import type { Metadata } from 'next'

// The review link's token is the key: keep the page out of search and the token out of Referer headers.
export const metadata: Metadata = {
  title: 'Review an owner email | Bunkcheck',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return children
}
