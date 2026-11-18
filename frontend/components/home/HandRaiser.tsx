'use client'

import { useState, type FormEvent } from 'react'
import { raiseHand } from '@/lib/handraiser'
import { track } from '@/lib/analytics'
import { US_STATES, stateName } from '@/lib/us-states'
import { Button, Field, Input, Notice, Select, TextLink } from '@/components/ui'

/** "5 and 8", "5, 8", "ages 5 & 8" -> [5, 8]. Anything that isn't a kid's age is dropped. */
export function parseAges(text: string): number[] {
  return (text.match(/\d+/g) ?? []).map(Number).filter(n => n >= 0 && n <= 18)
}

/**
 * The hand-raiser form: an email and a state, and optionally a town and the kids' ages. We open
 * state by state, so the state is what puts her in the right line. No email is sent.
 */
export function HandRaiserForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('')
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
      await raiseHand(email, state, town, kids)
      track('hand_raised', { state, has_town: !!town.trim(), kids: kids.length })
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
        You&rsquo;re in line, and thank you. We&rsquo;ll write as soon as {stateName(state)} opens.
      </Notice>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email">
          {id => (
            <Input id={id} type="email" required autoComplete="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          )}
        </Field>
        <Field label="Your state" hint="So we know which line you&rsquo;re in.">
          {id => (
            <Select id={id} required value={state} onChange={e => setState(e.target.value)} autoComplete="address-level1">
              <option value="" disabled>Choose your state</option>
              {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Your town" optional>
          {id => <Input id={id} value={town} onChange={e => setTown(e.target.value)} placeholder="Barrington" autoComplete="address-level2" />}
        </Field>
        <Field label="Kids&rsquo; ages" optional>
          {id => <Input id={id} value={ages} onChange={e => setAges(e.target.value)} placeholder="5 and 8" inputMode="text" />}
        </Field>
      </div>
      <Button type="submit" size="lg" disabled={busy}>{busy ? 'Saving…' : 'Save my spot'}</Button>
      {error && <p className="text-small text-error" role="alert">{error}</p>}
      <p className="text-caption text-muted">
        One email, when your state opens. No ads, and we never sell your details.{' '}
        <TextLink href="/privacy" tone="muted" className="underline underline-offset-4">Privacy</TextLink>
      </p>
    </form>
  )
}
