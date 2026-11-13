'use client'

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

// The campfinder project's public sign-in settings. Both are public by design: the publishable
// key ships to every browser and, with row-level security on every table and no policies, can
// read or write nothing. Only the backend (secret key, on Railway) touches data. Env vars
// override these, e.g. for a local Supabase; scripts/check-public-env.mjs stops a build whose
// NEXT_PUBLIC_SUPABASE_ANON_KEY is anything but a public key. The legacy anon JWT was disabled
// on 13 November 2026.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdzzmyambonhkhsoltfw.supabase.co'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_QAmo8CV7uhTXMlRV48sCNQ_8sc88Vjg'

let client: SupabaseClient | null = null

/** Browser Supabase client for sign-in only. Null when sign-in isn't configured. */
export function supabase(): SupabaseClient | null {
  if (!URL || !ANON) return null
  if (!client) client = createClient(URL, ANON, { auth: { persistSession: true, detectSessionInUrl: true } })
  return client
}

export async function authHeaders(): Promise<Record<string, string>> {
  const sb = supabase()
  if (!sb) return {}
  const { data } = await sb.auth.getSession()
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}
}

/** Email sign-in link. Returns an error message, or null on success. */
export async function sendSignInLink(email: string, returnPath = '/signin'): Promise<string | null> {
  const sb = supabase()
  if (!sb) return 'Sign-in is not set up yet.'
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}${returnPath}` },
  })
  return error ? error.message : null
}

export async function signOut() {
  await supabase()?.auth.signOut()
}

/** Current session; undefined while loading. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    const sb = supabase()
    if (!sb) { setSession(null); return }
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}
