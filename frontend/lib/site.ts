// Public contact details shown on the policy and support pages and in app listings.
export const COMPANY = 'PromptBridge LLC'
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'hello@bunkcheck.ai'
export const POLICY_UPDATED = 'October 13, 2026'

// The address parents paste into Claude (or any assistant that takes a remote MCP connector).
// next.config.js proxies /mcp to the API's /claude/mcp. Keep the www: the bare domain answers
// with a redirect, and a connector should not have to follow one.
export const CONNECTOR_URL = 'https://www.bunkcheck.ai/mcp'
