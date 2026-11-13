#!/usr/bin/env node
// Runs before every `next build` (npm "prebuild"), on Vercel and in CI.
//
// Anything named NEXT_PUBLIC_* is copied into the JavaScript every visitor downloads. This
// stops the build when one of those values is a secret, or when the Supabase sign-in key is
// not a public key. It never prints a value: only the variable's name and what is wrong.
//
// Why: on 13 November 2026 NEXT_PUBLIC_SUPABASE_ANON_KEY held a database connection string
// with the service_role key inside it. The site shipped the admin key to every browser, and
// sign-in failed with "Invalid API key".

const SECRET_SHAPES = [
  [/sb_secret_/, 'a Supabase secret key (sb_secret_...)'],
  [/\b(postgres|postgresql|mysql|redis):\/\//i, 'a database connection string'],
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/, 'a Resend API key'],
  [/\bsk-ant-/, 'an Anthropic API key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
]

function jwtRole(value) {
  const parts = value.split('.')
  if (parts.length !== 3) return null
  try {
    const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json).role ?? null
  } catch {
    return null
  }
}

/** Problems with the public env, as "NAME: what is wrong". Values are never included. */
export function problems(env) {
  const out = []
  for (const [name, raw] of Object.entries(env)) {
    if (!name.startsWith('NEXT_PUBLIC_') || raw == null || raw === '') continue
    const value = String(raw)
    for (const [shape, what] of SECRET_SHAPES) {
      if (shape.test(value)) out.push(`${name}: looks like ${what}, which must never reach the browser`)
    }
    for (const token of value.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
      const role = jwtRole(token)
      if (role && role !== 'anon') out.push(`${name}: holds a Supabase key with role "${role}", which must never reach the browser`)
    }
  }

  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (key) {
    // Only the publishable key: the legacy anon JWT was disabled on 13 November 2026, so a build
    // carrying it would ship a site where sign-in fails.
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
      out.push('NEXT_PUBLIC_SUPABASE_ANON_KEY: must be exactly the publishable key (sb_publishable_...) from ' +
        'Supabase > Project Settings > API Keys, with no quotes, spaces or anything around it')
    }
  }
  return [...new Set(out)]
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = problems(process.env)
  if (found.length) {
    console.error('Public environment check failed. Nothing was built.\n')
    for (const p of found) console.error(`  - ${p}`)
    console.error('\nFix the variable in Vercel (Settings > Environment Variables), then redeploy.')
    process.exit(1)
  }
  console.log('Public environment check passed.')
}
