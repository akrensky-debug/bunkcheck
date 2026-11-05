import type { Metadata } from 'next'
import Reference from './Reference'

// Living reference for the UI kit in components/ui. Not linked from the site, not in a sitemap.
export const metadata: Metadata = {
  title: 'UI kit | Bunkcheck',
  robots: { index: false, follow: false },
}

export default function UIPage() {
  return <Reference />
}
