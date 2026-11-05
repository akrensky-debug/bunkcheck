'use client'

import { useEffect, useRef } from 'react'
import { supabase, useSession } from '@/lib/auth'
import { Icon } from '@/components/ui'

const ITEMS = [
  { href: '/household', label: 'Household' },
  { href: '/registrations', label: 'Registrations' },
  { href: '/kit', label: 'Info kit' },
]

/** "Sign in", or once signed in an Account menu with the family pages. */
export default function AccountLink() {
  const session = useSession()
  const menu = useRef<HTMLDetailsElement>(null)

  // Close the menu on outside click or Escape.
  useEffect(() => {
    const close = (e: Event) => {
      const el = menu.current
      if (!el?.open) return
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) el.open = false
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', close) }
  }, [])

  if (!supabase() || session === undefined) return null
  if (!session) {
    return <a href="/signin" className="text-small font-semibold text-ink hover:text-muted transition-colors whitespace-nowrap">Sign in</a>
  }
  return (
    <details ref={menu} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-small font-semibold text-ink hover:text-muted transition-colors [&::-webkit-details-marker]:hidden">
        Account <Icon name="chevron-down" size={14} />
      </summary>
      <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-line bg-surface py-1.5 shadow-soft">
        {ITEMS.map(i => (
          <a key={i.href} href={i.href} className="block px-4 py-2 text-small text-ink hover:bg-tint transition-colors">{i.label}</a>
        ))}
      </div>
    </details>
  )
}
