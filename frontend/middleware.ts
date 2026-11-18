import { NextResponse, type NextRequest } from 'next/server'
import { HANDRAISER_HOSTS, HAND_RAISER_PATH, NOINDEX_HOSTS, isGated } from '@/lib/site-mode'

/**
 * On a hand-raiser host (www today), the home page shows the hand-raiser and the rest of the
 * parent app sends people back to it. Every other host runs the whole app. See lib/site-mode.ts.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase()
  const { pathname } = req.nextUrl

  if (HANDRAISER_HOSTS.includes(host) && isGated(pathname)) {
    const url = req.nextUrl.clone()
    url.search = ''
    if (pathname === '/') {
      url.pathname = HAND_RAISER_PATH
      return NextResponse.rewrite(url)
    }
    url.pathname = '/'
    return NextResponse.redirect(url, 307) // temporary: these paths come back when the app opens
  }

  const res = NextResponse.next()
  if (NOINDEX_HOSTS.includes(host)) res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}

// Pages only: not Next's own files, not anything with a file extension, not the /mcp proxy.
export const config = { matcher: ['/((?!_next/|mcp$|.*\\..*).*)'] }
