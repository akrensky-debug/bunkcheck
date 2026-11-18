// Which hosts show the hand-raiser page in place of the parent app.
//
// Today www.bunkcheck.ai shows the hand-raiser. The whole app runs at the project's own Vercel
// address, frontend-camp-finder.vercel.app, and on every Vercel preview. dev.bunkcheck.ai will do
// the same once that domain is added. To open the app on www, set NEXT_PUBLIC_HANDRAISER_HOSTS=none in Vercel
// and redeploy. Nothing else changes. See docs/DEPLOY.md.
//
// "Keep the plumbing": on a hand-raiser host, only the parent app's own pages are replaced.
// Camp pages, the links we have already emailed to camps and parents (/owners, /alerts,
// /share, /inquiries, /join), the for-camps pages, /connect, /mcp and the legal pages keep
// working.

const list = (value: string | undefined, fallback: string) =>
  (value ?? fallback).split(',').map(h => h.trim().toLowerCase()).filter(h => h && h !== 'none')

export const HANDRAISER_HOSTS = list(process.env.NEXT_PUBLIC_HANDRAISER_HOSTS, 'www.bunkcheck.ai,bunkcheck.ai')

// Hosts search engines should leave alone.
export const NOINDEX_HOSTS = list(process.env.NEXT_PUBLIC_NOINDEX_HOSTS, 'frontend-camp-finder.vercel.app,dev.bunkcheck.ai')

// The parent app. Each entry covers the path itself and anything under it.
const GATED = ['/search', '/summer', '/household', '/kit', '/registrations', '/signin', '/activities']

export function isGated(pathname: string): boolean {
  return pathname === '/' || GATED.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export const HAND_RAISER_PATH = '/waitlist'
