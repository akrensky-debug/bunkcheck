'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Container, Heading, Input, Text, TextLink } from '@/components/ui'
import { sendSignInLink, signOut, supabase, useSession } from '@/lib/auth'
import { rememberFamily } from '@/lib/agent'
import { ROLE_LABELS, acceptInvite, previewInvite, type InvitePreview } from '@/lib/household'

export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const session = useSession()
  const router = useRouter()
  const [invite, setInvite] = useState<InvitePreview | null>(null)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const tried = useRef(false)

  useEffect(() => {
    previewInvite(token).then(setInvite).catch(e => setError(e.message))
  }, [token])

  async function accept() {
    setBusy(true)
    setError('')
    try {
      const res = await acceptInvite(token)
      rememberFamily(res.family_id)
      router.replace('/household')
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  // Back from the sign-in email: accept straight away.
  useEffect(() => {
    if (session && invite && !invite.expired && !tried.current) {
      tried.current = true
      accept()
    }
  }, [session, invite]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const err = await sendSignInLink(email.trim(), `/join/${token}`)
    setBusy(false)
    if (err) setError(err)
    else setSent(true)
  }

  return (
    <Container size="narrow" className="py-20 sm:py-28"><div className="max-w-md space-y-6">
      {!invite ? (
        <>
          <Heading level="h1">Join a family</Heading>
          <Text tone="muted">{error || 'Checking your invite…'}</Text>
          {error && (
            <p className="text-small text-muted">
              Already joined? <TextLink href="/household" arrow>Go to your household</TextLink>
            </p>
          )}
        </>
      ) : (
        <>
          <div className="space-y-3">
            <Text tone="muted" variant="small">Hi {invite.display_name},</Text>
            <Heading level="h1">{invite.invited_by} invited you to help with their family&rsquo;s summer plan</Heading>
          </div>
          <div className="space-y-1 border-y border-line py-4 text-small text-ink">
            <p><span className="font-semibold">{ROLE_LABELS[invite.role]}:</span> you&rsquo;ll see {invite.role_help}.</p>
            <p className="text-muted">You&rsquo;ll get a short email before each job, and can turn that off any time.</p>
          </div>

          {invite.expired ? (
            <p className="text-error">This invite has expired. Ask {invite.invited_by} to send a new one.</p>
          ) : !supabase() ? (
            <p className="text-muted">Sign-in isn't set up on this site yet.</p>
          ) : session ? (
            <div className="space-y-3">
              <p className="text-small text-muted">Signed in as {session.user.email}.</p>
              <Button onClick={accept} disabled={busy} size="lg" block>
                {busy ? 'Joining…' : 'Accept and join'}
              </Button>
              {error && (
                <div className="text-small text-error space-y-1">
                  <p>{error}</p>
                  <Button variant="link" onClick={() => signOut().then(() => { tried.current = true; setError('') })}>
                    Use a different email
                  </Button>
                </div>
              )}
            </div>
          ) : sent ? (
            <div>
              <Heading level="h3" as="p" className="mb-1">Check your email.</Heading>
              <p className="text-muted text-small">We sent a sign-in link to {email}. Open it to finish joining.</p>
            </div>
          ) : (
            <form onSubmit={sendLink} className="space-y-3">
              <p className="text-small text-muted">
                Sign in with the address the invite went to ({invite.email_hint}). No password; we'll email you a link.
              </p>
              <Input
                type="email" required aria-label="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              />
              <Button type="submit" disabled={busy} size="lg" block>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </Button>
              {error && <p className="text-small text-error">{error}</p>}
            </form>
          )}
        </>
      )}
    </div></Container>
  )
}
