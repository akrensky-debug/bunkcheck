'use client'

import { supabase, useSession } from '@/lib/auth'

export default function AccountLink() {
  const session = useSession()
  if (!supabase() || session === undefined) return null
  return session ? (
    <span className="flex items-center gap-4">
      <a href="/household" className="text-sm font-medium text-muted hover:text-navy whitespace-nowrap">Household</a>
      <a href="/registrations" className="hidden sm:inline text-sm font-medium text-muted hover:text-navy whitespace-nowrap">Registrations</a>
      <a href="/kit" className="text-sm font-medium text-muted hover:text-navy whitespace-nowrap">Info kit</a>
    </span>
  ) : (
    <a href="/signin" className="text-sm font-medium text-muted hover:text-navy whitespace-nowrap">Sign in</a>
  )
}
