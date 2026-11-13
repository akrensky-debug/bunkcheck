/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
// Vercel previews have no NEXT_PUBLIC_API_URL, and Vercel won't proxy to localhost, so on a
// Vercel build without one, /mcp goes to the production API. Its tools are public camp data.
const MCP_UPSTREAM = process.env.NEXT_PUBLIC_API_URL
  || (process.env.VERCEL ? 'https://api-production-4a03.up.railway.app' : 'http://localhost:8000')

const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
  },
  // www.bunkcheck.ai/mcp is the short connector address on /connect. It proxies to the API's
  // Claude endpoint, which leaves out ui.domain so Claude renders the camp cards.
  async rewrites() {
    return [
      { source: '/mcp', destination: `${MCP_UPSTREAM}/claude/mcp` },
    ]
  },
}

module.exports = nextConfig
