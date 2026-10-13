'use client'

import { supabase, useSession } from '@/lib/auth'

export default function AccountLink() {
  const session = useSession()
  if (!supabase() || session === undefined) return null
  return session ? (
    <a href="/kit" className="text-sm font-medium text-muted hover:text-navy whitespace-nowrap">Info kit</a>
  ) : (
    <a href="/signin" className="text-sm font-medium text-muted hover:text-navy whitespace-nowrap">Sign in</a>
  )
}
