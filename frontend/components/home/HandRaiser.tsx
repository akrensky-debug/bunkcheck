'use client'

import { useState, type FormEvent } from 'react'
import { raiseHand } from '@/lib/handraiser'
import { track } from '@/lib/analytics'
import { Button, Field, Input, Notice, TextLink } from '@/components/ui'

/** "5 and 8", "5, 8", "ages 5 & 8" -> [5, 8]. Anything that isn't a kid's age is dropped. */
export function parseAges(text: string): number[] {
  return (text.match(/\d+/g) ?? []).map(Number).filter(n => n >= 0 && n <= 18)
}

/** The hand-raiser form: an email, and optionally a town and the kids' ages. No email is sent. */
export function HandRaiserForm() {
  const [email, setEmail] = useState('')
  const [town, setTown] = useState('')
  const [ages, setAges] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const kids = parseAges(ages)
      await raiseHand(email, town, kids)
      track('hand_raised', { has_town: !!town.trim(), kids: kids.length })
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Notice tone="success" className="max-w-measure">
        You&rsquo;re on the list. We&rsquo;ll write when Bunkcheck opens near {town.trim() || 'you'}.
      </Notice>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        {id => (
          <Input id={id} type="email" required autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your town" optional>
          {id => <Input id={id} value={town} onChange={e => setTown(e.target.value)} placeholder="Barrington, RI" autoComplete="address-level2" />}
        </Field>
        <Field label="Kids&rsquo; ages" optional>
          {id => <Input id={id} value={ages} onChange={e => setAges(e.target.value)} placeholder="5 and 8" inputMode="text" />}
        </Field>
      </div>
      <Button type="submit" size="lg" disabled={busy}>{busy ? 'Saving…' : 'Raise my hand'}</Button>
      {error && <p className="text-small text-error" role="alert">{error}</p>}
      <p className="text-caption text-muted">
        One email, when Bunkcheck opens near you. No ads, and we never sell your details.{' '}
        <TextLink href="/privacy" tone="muted" className="underline underline-offset-4">Privacy</TextLink>
      </p>
    </form>
  )
}
