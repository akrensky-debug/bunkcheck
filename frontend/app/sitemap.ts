import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// The public pages that work on www today (lib/site-mode.ts). Camp pages aren't listed yet: the
// API has no call that returns every camp's address. When it does, add them here.
const PAGES: Array<[string, number]> = [
  ['/', 1],
  ['/operators', 0.7],
  ['/operators/submit', 0.6],
  ['/operators/claim', 0.6],
  ['/connect', 0.6],
  ['/ranking', 0.5],
  ['/support', 0.4],
  ['/privacy', 0.2],
  ['/terms', 0.2],
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(([path, priority]) => ({ url: `${SITE_URL}${path === '/' ? '' : path}`, priority }))
}
