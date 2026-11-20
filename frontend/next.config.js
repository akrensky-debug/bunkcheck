/** @type {import('next').NextConfig} */
// Vercel previews may have no NEXT_PUBLIC_API_URL, and a browser can't reach localhost on
// Vercel, so a Vercel build without one uses the production API, for the pages and for /mcp.
// That means a preview reads and writes real data (decided 20 November 2026): families made
// while trying a preview are real families. Local builds still default to localhost.
const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.VERCEL ? 'https://api-production-4a03.up.railway.app' : 'http://localhost:8000')
const MCP_UPSTREAM = API_URL

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
  async headers() {
    return [{
      source: '/:path*',
      headers: [{ key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' }],
    }]
  },
  async rewrites() {
    return [
      { source: '/mcp', destination: `${MCP_UPSTREAM}/claude/mcp` },
      { source: '/chatgpt/mcp', destination: `${MCP_UPSTREAM}/chatgpt/mcp` },
      { source: '/.well-known/openai-apps-challenge', destination: `${MCP_UPSTREAM}/.well-known/openai-apps-challenge` },
    ]
  },
}

module.exports = nextConfig
