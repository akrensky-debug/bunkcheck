import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import { NOINDEX_HOSTS } from '@/lib/site-mode'

// Pages whose address holds a private token, plus the UI kit. Nothing links to them, so this is
// a second line behind the noindex headers in next.config.js.
const PRIVATE = ['/alerts/', '/inquiries/', '/join/', '/share/', '/owners/', '/ui']

// Read per request: one build serves www (open to search) and the app's own Vercel addresses
// (closed, see lib/site-mode.ts).
export default function robots(): MetadataRoute.Robots {
  const host = (headers().get('host') ?? '').split(':')[0].toLowerCase()
  if (NOINDEX_HOSTS.includes(host) || host.endsWith('.vercel.app')) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: PRIVATE },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
