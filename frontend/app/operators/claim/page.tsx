'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { searchCamps, type CampSearchResult } from '@/lib/api'
import { Events } from '@/lib/analytics'
import { Button, Container, Field, Heading, Icon, Input, List, SearchBar, SearchField, Text, TextLink } from '@/components/ui'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function ClaimFlow() {
  const params = useSearchParams()
  const prefillId = params.get('camp_id')

  const [step, setStep] = useState<'search' | 'confirm' | 'verify' | 'done'>(prefillId ? 'confirm' : 'search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CampSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<CampSearchResult | null>(null)
  const [email, setEmail] = useState('')
  const [contactName, setContactName] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError('')
    try {
      const data = await searchCamps({ location: query, limit: 10 })
      setResults(data.results)
      if (data.results.length === 0) setError('No camps found. Try a different name or city.')
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  function selectCamp(camp: CampSearchResult) {
    setSelected(camp)
    Events.claimFlowStarted(camp.id)
    setStep('confirm')
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camp_id: selected.id,
          email,
          contact_name: contactName || undefined,
          role: role || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Claim failed')
      }
      setStep('verify')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setVerifying(true)
    setVerifyError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/claims/verify?token=${encodeURIComponent(token)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Invalid or expired token')
      }
      setStep('done')
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <TextLink href="/operators" tone="muted" className="mb-10 text-small">
        <Icon name="arrow-left" size={14} />For camps
      </TextLink>

      {/* Step: Search */}
      {step === 'search' && (
        <>
          <Heading level="h1" className="mb-3">Claim your listing</Heading>
          <Text tone="muted" className="mb-8">
            Find your camp below. Claiming lets you update sessions, pricing and contact details, and parents see
            that a verified owner manages the listing.
          </Text>

          <SearchBar onSubmit={handleSearch} busy={searching}>
            <SearchField label="Camp" grow placeholder="Camp name or town" value={query} onChange={e => setQuery(e.target.value)} />
          </SearchBar>

          {error && <p className="mt-4 text-small text-error">{error}</p>}

          {results.length > 0 && (
            <div className="mt-8">
              <p className="mb-2 text-small text-muted">Choose your camp</p>
              <List>
                {results.map(camp => (
                  <li key={camp.id}>
                    <button
                      onClick={() => selectCamp(camp)}
                      className="block w-full rounded-md px-3 py-4 text-left transition-colors duration-150 hover:bg-tint"
                    >
                      <p className="text-body font-semibold text-ink">{camp.name}</p>
                      <p className="text-small text-muted">{camp.city}, {camp.state}</p>
                    </button>
                  </li>
                ))}
              </List>
              <p className="mt-4 text-small text-muted">
                Don&rsquo;t see your camp? <TextLink href="/operators/submit" arrow>Submit it</TextLink>
              </p>
            </div>
          )}
        </>
      )}

      {/* Step: Confirm & submit claim */}
      {step === 'confirm' && selected && (
        <>
          <Heading level="h1" className="mb-3">Claim this listing</Heading>
          <div className="mb-8 border-y border-line py-4">
            <p className="text-body font-semibold text-ink">{selected.name}</p>
            <p className="text-small text-muted">{selected.city}, {selected.state}</p>
          </div>

          <form onSubmit={handleClaim} className="space-y-5">
            <Field label="Your email" hint="We'll send a verification link to this address.">
              {id => <Input id={id} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="director@yourcamp.com" />}
            </Field>
            <Field label="Your name" optional>
              {id => <Input id={id} type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jane Smith" />}
            </Field>
            <Field label="Your role" optional>
              {id => <Input id={id} type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="Director, owner, marketing" />}
            </Field>

            {error && <p className="text-small text-error">{error}</p>}

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? 'Sending verification…' : 'Send verification email'}
              </Button>
              <Button variant="quiet" onClick={() => { setStep('search'); setSelected(null) }}>
                Search again
              </Button>
            </div>
          </form>
        </>
      )}

      {/* Step: Enter token */}
      {step === 'verify' && (
        <>
          <Heading level="h1" className="mb-3">Check your email</Heading>
          <Text tone="muted" className="mb-8">
            We&rsquo;ve sent a verification code to <strong className="text-ink">{email}</strong>. Enter it below to complete your claim.
          </Text>

          <form onSubmit={handleVerify} className="space-y-5">
            <Field label="Verification code" error={verifyError || undefined}>
              {id => <Input id={id} type="text" placeholder="Paste the code" value={token} onChange={e => setToken(e.target.value)} required className="font-mono" />}
            </Field>
            <Button type="submit" size="lg" disabled={verifying}>
              {verifying ? 'Verifying…' : 'Verify and claim listing'}
            </Button>
          </form>
        </>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div>
          <p className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-checked-soft text-checked">
            <Icon name="check" size={24} label="Done" />
          </p>
          <Heading level="h1" className="mb-3">Listing claimed</Heading>
          <Text tone="muted" className="mb-10">
            Your ownership is verified. You can now update your listing, add sessions and manage your camp&rsquo;s
            details on Bunkcheck.
          </Text>
          <Heading level="h3" as="h2" className="mb-3">What happens next</Heading>
          <ul className="divide-y divide-line border-y border-line text-small text-ink">
            <li className="py-3">Your listing now shows that it&rsquo;s claimed by the camp.</li>
            <li className="py-3">Parents see that a verified owner manages your details.</li>
            <li className="py-3">Reply to any email from us with new sessions, dates or prices and a person will update them.</li>
          </ul>
        </div>
      )}
    </Container>
  )
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<Container size="narrow" className="py-24 text-center text-muted">Loading…</Container>}>
      <ClaimFlow />
    </Suspense>
  )
}
