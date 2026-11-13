/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
  },
  // www.bunkcheck.ai/mcp is the short connector address on /connect. It proxies to the API's
  // Claude endpoint, which leaves out ui.domain so Claude renders the camp cards.
  async rewrites() {
    return [
      { source: '/mcp', destination: `${API_URL}/claude/mcp` },
    ]
  },
}

module.exports = nextConfig
