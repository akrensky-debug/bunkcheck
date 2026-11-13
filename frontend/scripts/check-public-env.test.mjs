// Cases for check-public-env.mjs. Keys here are made up; run with `node scripts/check-public-env.test.mjs`.
import { problems } from './check-public-env.mjs'
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = role => `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64({ iss: 'supabase', ref: 'x', role })}.fakesig_000`
const cases = [
  ['13 Nov failure: connection string with service JWT', { NEXT_PUBLIC_SUPABASE_ANON_KEY: `postgresql://postgres.x:[${jwt('service_role')}]@h:5432/postgres` }, true],
  ['service_role JWT alone', { NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('service_role') }, true],
  ['sb_secret key', { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_abcdefghijklmnop' }, true],
  ['publishable with trailing space', { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_abc123 ' }, true],
  ['quoted publishable', { NEXT_PUBLIC_SUPABASE_ANON_KEY: '"sb_publishable_abc123"' }, true],
  ['secret in another NEXT_PUBLIC var', { NEXT_PUBLIC_API_URL: 'https://api', NEXT_PUBLIC_DEBUG: 're_AbCdEfGh12_XyZaBcDe34' }, true],
  ['publishable key', { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_QAmo8CV7uhTXMlRV48sCNQ_8sc88Vjg', NEXT_PUBLIC_API_URL: 'https://api.bunkcheck.ai' }, false],
  ['legacy anon JWT (disabled)', { NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon') }, true],
  ['unset (CI, local dev)', { NEXT_PUBLIC_API_URL: 'http://localhost:8000' }, false],
  ['secrets in non-public vars are not our business', { DATABASE_URL: 'postgresql://u:p@h/db', SUPABASE_SERVICE_KEY: jwt('service_role') }, false],
]
let bad = 0
for (const [name, env, shouldFail] of cases) {
  const p = problems(env); const ok = (p.length > 0) === shouldFail
  if (!ok) bad++
  const leaked = p.some(x => Object.values(env).some(v => v.length > 12 && x.includes(v)))
  if (leaked) bad++
  console.log(`${ok && !leaked ? 'PASS' : 'FAIL'}  ${name}${p.length ? '  -> ' + p[0] : ''}${leaked ? '  (LEAKED VALUE)' : ''}`)
}
process.exit(bad ? 1 : 0)
