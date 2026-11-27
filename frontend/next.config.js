/** @type {import('next').NextConfig} */
// Vercel previews may have no NEXT_PUBLIC_API_URL, and a browser can't reach localhost on
// Vercel, so a Vercel build without one uses the production API, for the pages and for /mcp.
// That means a preview reads and writes real data (decided 20 November 2026): families made
// while trying a preview are real families. Local builds still default to localhost.
const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.VERCEL ? 'https://api-production-4a03.up.railway.app' : 'http://localhost:8000')
const MCP_UPSTREAM = API_URL
const { scriptPolicy } = require('./csp')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdzzmyambonhkhsoltfw.supabase.co'
const SCRIPT_POLICY = scriptPolicy({
  apiUrl: API_URL,
  supabaseUrl: SUPABASE_URL,
  preview: process.env.VERCEL_ENV === 'preview',
  dev: process.env.NODE_ENV === 'development',
})

// docs/security.md, open gap 1. frame-ancestors is the only CSP directive on purpose: it stops
// another site putting our pages in a frame (clickjacking the share, join and confirm pages) and
// restricts nothing else, so it can't break Supabase sign-in the way a full policy could.
// X-Frame-Options says the same to older browsers.
const SITE_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The script policy, reporting only (csp.js). frame-ancestors stays in the enforced header above,
  // because browsers ignore it in a report-only policy.
  { key: 'Content-Security-Policy-Report-Only', value: SCRIPT_POLICY },
  { key: 'Reporting-Endpoints', value: 'csp="/csp-report"' },
]

// Pages whose address holds a private token. Keep the token out of the Referer header a link on
// the page would send, and keep the page out of search.
const TOKEN_PAGES = ['/share/:path*', '/join/:path*', '/inquiries/:path*', '/alerts/:path*', '/owners/:path*']
const TOKEN_HEADERS = [
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
]

const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
  },
  // www.bunkcheck.ai/mcp is the short connector address on /connect. It proxies to the API's
  // Claude endpoint, which leaves out ui.domain so Claude renders the camp cards.
  // The ChatGPT endpoint and OpenAI's domain check are served the same way, so the ChatGPT app
  // lives on www.bunkcheck.ai (a domain we already prove we own) and needs no api. subdomain.
  // Only our own pages may ask for location (camp search's "Use my location"); nothing on the
  // site uses the camera, microphone or payments, so nothing embedded can ask for them either.
  // When two entries set the same header for a path, the later one wins.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' },
          ...SITE_HEADERS,
        ],
      },
      ...TOKEN_PAGES.map(source => ({ source, headers: TOKEN_HEADERS })),
    ]
  },
  async rewrites() {
    return [
      { source: '/mcp', destination: `${MCP_UPSTREAM}/claude/mcp` },
      { source: '/chatgpt/mcp', destination: `${MCP_UPSTREAM}/chatgpt/mcp` },
      { source: '/.well-known/openai-apps-challenge', destination: `${MCP_UPSTREAM}/.well-known/openai-apps-challenge` },
      // Script policy reports, same origin so browsers send them without a CORS preflight.
      { source: '/csp-report', destination: `${API_URL}/api/v1/csp-report` },
    ]
  },
}

module.exports = nextConfig
