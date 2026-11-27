// The site's script policy (docs/security.md, open gap 1). Sent as Content-Security-Policy-Report-Only
// for now: browsers report what it would block and block nothing. Reports go to /csp-report, which
// next.config.js forwards to the API (campfinder/services/csp_reports.py). Once real traffic shows
// none, the same policy moves to the enforced Content-Security-Policy header.
//
// What the pages load, from a crawl of the production build (20 November 2026):
//   scripts   our own files, our one inline script in app/layout.tsx, and the inline scripts
//             Next.js writes into every page. Those change per page, so they can't be hashed;
//             a nonce would make every static page render per request. Hence 'unsafe-inline'.
//             Host allowlisting still stops a script loading from anywhere else.
//   connect   our API and Supabase sign-in, nothing else
//   images    our own files, plus data: and blob: URLs
//   fonts     self-hosted (public/fonts, next/font)
//   frames    none; no other site may frame us either (frame-ancestors, enforced separately)
// Vercel's preview toolbar needs its own hosts (vercel.com/docs/vercel-toolbar/managing-toolbar),
// allowed on preview builds only.

function origin(url) {
  return new URL(url).origin
}

function scriptPolicy({ apiUrl, supabaseUrl, preview = false, dev = false }) {
  const live = preview ? ['https://vercel.live'] : []
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...live],
    'style-src': ["'self'", "'unsafe-inline'", ...live],
    'img-src': ["'self'", 'data:', 'blob:', ...(preview ? ['https://vercel.live', 'https://vercel.com'] : [])],
    'font-src': ["'self'", ...(preview ? ['https://vercel.live', 'https://assets.vercel.com'] : [])],
    'connect-src': ["'self'", origin(apiUrl), origin(supabaseUrl),
                    ...(preview ? ['https://vercel.live', 'wss://ws-us3.pusher.com'] : [])],
    'frame-src': preview ? live : ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'report-uri': ['/csp-report'],
    'report-to': ['csp'],
  }
  return Object.entries(directives).map(([k, v]) => `${k} ${[...new Set(v)].join(' ')}`).join('; ')
}

module.exports = { scriptPolicy }
