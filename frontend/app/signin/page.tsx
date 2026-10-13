'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendSignInLink, supabase, useSession } from '@/lib/auth'
import { loadFamily } from '@/lib/agent'
import { Button, Container, Heading, Input, Text } from '@/components/ui'

export default function SignInPage() {
  const session = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Arriving back from the email link: save the guest family to the account, then go on.
  useEffect(() => {
    if (!session) return
    loadFamily().then(() => router.replace('/kit')).catch(() => router.replace('/'))
  }, [session, router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const err = await sendSignInLink(email.trim())
    setBusy(false)
    if (err) setError(err)
    else setSent(true)
  }

  if (!supabase()) {
    return <Shell><Text tone="muted">Sign-in isn&rsquo;t set up on this site yet.</Text></Shell>
  }

  if (session) {
    return <Shell><Text tone="muted">Signing you in…</Text></Shell>
  }

  return (
    <Shell>
      {sent ? (
        <div>
          <Heading level="h3" as="p" className="mb-1">Check your email.</Heading>
          <Text tone="muted">We sent a sign-in link to {email}. Open it on this device to continue.</Text>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Text tone="muted">
            No password. We&rsquo;ll email you a link. Your kids, plans and calendar are saved to your account,
            and your info kit stays locked to it.
          </Text>
          <Input
            type="email"
            required
            aria-label="Email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </Button>
          {error && <p className="text-small text-error">{error}</p>}
        </form>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Container size="narrow" className="py-20 sm:py-28">
      <div className="max-w-md">
        <Heading level="h1" className="mb-4">Save your family</Heading>
        {children}
      </div>
    </Container>
  )
}
