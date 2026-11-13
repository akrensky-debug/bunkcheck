'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Button, Checkbox, ChoiceChip, Container, Field, Heading, Input, Notice, Section, Text, Textarea,
} from '@/components/ui'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SnapshotSession { name: string | null; start_date: string; end_date: string; price: number | null }
interface Suggested { name: string | null; start_date: string; end_date: string; was_start: string; was_end: string; note: string | null }

interface View {
  camp_name: string
  city: string | null
  season_year: number
  shown_season: number | null
  snapshot: { camp: Record<string, string | number | null>; sessions: SnapshotSession[] }
  suggested: Suggested[]
  price_per_week: number | null
  registration: string | null
}

interface Change { what: string; before: string | string[] | null; after: string | string[] | null }
interface Result {
  camp_name: string
  changes: Change[]
  sessions_now: string[]
  price_now: string | null
  registration_now: string | null
  camp_verified: boolean
  not_set: string[]
  skipped: string[]
}

interface Row { key: number; name: string; start: string; end: string; price: string; note: string | null; was: string | null }

const LABELS: Record<string, string> = {
  name: 'Name', city: 'Town', state: 'State', camp_type: 'Type', age_min: 'Youngest age', age_max: 'Oldest age',
  grade_min: 'Lowest grade', grade_max: 'Highest grade', website_url: 'Website', registration_url: 'Registration page',
}

const TYPES: Record<string, string> = { day: 'Day camp', sleepaway: 'Sleepaway camp', specialty: 'Specialty program' }

function day(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function sessionLine(s: { name: string | null; start_date: string; end_date: string; price?: number | null }) {
  const when = `${day(s.start_date)} to ${day(s.end_date)}, ${s.end_date.slice(0, 4)}`
  const price = s.price != null ? `, $${s.price}` : ''
  return s.name ? `${s.name}: ${when}${price}` : `${when}${price}`
}

function lines(v: string | string[] | null) {
  if (v == null) return ['Nothing listed']
  return Array.isArray(v) ? v : [v]
}

/** The owner's page behind the season update email. Opening it changes nothing; sending does. */
export default function SeasonUpdatePage() {
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<View | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Result | null>(null)

  const [dates, setDates] = useState<'given' | 'not_set' | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [price, setPrice] = useState('')
  const [priceNotSet, setPriceNotSet] = useState(false)
  const [regDay, setRegDay] = useState('')
  const [regTime, setRegTime] = useState('')
  const [regNotSet, setRegNotSet] = useState(false)
  const [restRight, setRestRight] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    fetch(`${API}/api/v1/owners/update/${token}`, { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) {
          setLoadError((await r.json().catch(() => ({}))).detail || 'This link has expired or was already used.')
          return
        }
        const v: View = await r.json()
        setView(v)
        setRows(v.suggested.map((s, i) => ({
          key: i, name: s.name ?? '', start: s.start_date, end: s.end_date, price: '', note: s.note,
          was: s.was_start === s.start_date ? null : `Last year: ${day(s.was_start)} to ${day(s.was_end)}`,
        })))
      })
      .catch(() => setLoadError('We could not load this page. Please try again.'))
  }, [token])

  function edit(key: number, patch: Partial<Row>) {
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)))
  }

  function addRow() {
    const last = rows[rows.length - 1]
    setRows(rs => [...rs, { key: Date.now(), name: '', start: last?.end ?? '', end: last?.end ?? '', price: '', note: null, was: null }])
  }

  async function send() {
    setBusy(true)
    setError('')
    const body: Record<string, unknown> = { rest_is_right: restRight, note: note.trim() || null }
    if (dates === 'given') {
      body.sessions = rows.map(r => ({
        name: r.name.trim() || null, start_date: r.start, end_date: r.end, price: r.price ? Number(r.price) : null,
      }))
    }
    if (dates === 'not_set') body.dates_not_set = true
    if (price && !priceNotSet) body.price_per_week = Number(price)
    if (priceNotSet) body.price_not_set = true
    if (regDay && !regNotSet) {
      body.registration_opens = regDay
      if (regTime) body.registration_time = regTime
    }
    if (regNotSet) body.registration_not_set = true
    try {
      const r = await fetch(`${API}/api/v1/owners/update/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const res = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(typeof res.detail === 'string' ? res.detail : 'Something in the form needs a look.')
      setDone(res)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Container size="narrow" className="space-y-10 py-16 sm:py-24">
        <header className="space-y-3">
          <Heading level="h1">Thank you. Here is what changed.</Heading>
          <Text tone="muted">We emailed you the same list. If anything is wrong, reply to that email and a person will fix it.</Text>
        </header>
        {done.changes.length === 0 && <Text>Nothing on {done.camp_name}&rsquo;s listing changed.</Text>}
        {done.changes.map(c => (
          <Section key={c.what} title={c.what} divided>
            <dl className="grid grid-cols-4 gap-2 text-small">
              <dt className="text-muted">Before</dt>
              <dd className="col-span-3 text-muted">{lines(c.before).map(l => <div key={l}>{l}</div>)}</dd>
              <dt className="text-muted">Now</dt>
              <dd className="col-span-3 font-semibold text-ink">{lines(c.after).map(l => <div key={l}>{l}</div>)}</dd>
            </dl>
          </Section>
        ))}
        {done.skipped.map(s => <Notice key={s} tone="warn">{s}</Notice>)}
        {done.camp_verified && (
          <Notice tone="success">Your page now shows &ldquo;confirmed by the camp&rdquo; with today&rsquo;s date.</Notice>
        )}
      </Container>
    )
  }

  if (!view) {
    return (
      <Container size="narrow" className="space-y-3 py-16 sm:py-24">
        <Heading level="h1">{loadError ? 'This link no longer works' : 'Loading'}</Heading>
        {loadError && <Text tone="muted">{loadError}</Text>}
      </Container>
    )
  }

  const y = view.season_year
  const shown = view.shown_season
  const facts = Object.entries(view.snapshot.camp).filter(([k, v]) => v !== null && v !== '' && LABELS[k])
  const canSend = dates !== null || price !== '' || priceNotSet || regDay !== '' || regNotSet || restRight || note.trim() !== ''

  return (
    <Container size="narrow" className="space-y-12 py-16 sm:py-24">
      <header className="space-y-3">
        <Text tone="muted" variant="small">Your {y} update for Bunkcheck</Text>
        <Heading level="h1">{view.camp_name}</Heading>
        <Text tone="muted">
          Parents are planning summer {y}. Send what you know now and leave the rest. No login, no fee to be listed.
        </Text>
      </header>

      <Section title={`${y} session dates`} divided>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <ChoiceChip type="radio" name="dates" checked={dates === 'given'} onChange={() => setDates('given')}>
              Enter {y} dates
            </ChoiceChip>
            <ChoiceChip type="radio" name="dates" checked={dates === 'not_set'} onChange={() => setDates('not_set')}>
              Not set yet
            </ChoiceChip>
          </div>
          {dates === 'given' && (
            <div className="space-y-6">
              {view.suggested.length > 0 && (
                <Text tone="muted" variant="small">
                  We started from your {shown ?? 'last'} weeks, moved to the same weekdays in {y}. Check each one, change
                  what&rsquo;s different, and remove any you aren&rsquo;t running.
                </Text>
              )}
              {rows.map((r, i) => (
                <fieldset key={r.key} className="space-y-3 border-t border-line pt-4">
                  <legend className="sr-only">Session {i + 1}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Name" optional>
                      {id => <Input id={id} value={r.name} placeholder={`Session ${i + 1}`} onChange={e => edit(r.key, { name: e.target.value })} />}
                    </Field>
                    <Field label="Price for the session" optional hint="Leave blank to use the price per week.">
                      {id => <Input id={id} type="number" min={0} inputMode="decimal" value={r.price} onChange={e => edit(r.key, { price: e.target.value })} />}
                    </Field>
                    <Field label="First day">
                      {id => <Input id={id} type="date" value={r.start} onChange={e => edit(r.key, { start: e.target.value })} />}
                    </Field>
                    <Field label="Last day">
                      {id => <Input id={id} type="date" value={r.end} onChange={e => edit(r.key, { end: e.target.value })} />}
                    </Field>
                  </div>
                  {r.was && <Text tone="muted" variant="caption">{r.was}</Text>}
                  {r.note && <Text tone="warn" variant="small">{r.note} Is that right?</Text>}
                  <Button variant="quiet" size="sm" onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))}>
                    Remove this session
                  </Button>
                </fieldset>
              ))}
              <Button variant="secondary" size="sm" leadingIcon="plus" onClick={addRow}>Add a session</Button>
            </div>
          )}
        </div>
      </Section>

      <Section title={`${y} price per week`} divided>
        <div className="space-y-3">
          <Field label="Price per week, in dollars" hint={view.price_per_week != null ? `${shown ?? 'Last year'}: $${view.price_per_week}` : undefined}>
            {id => <Input id={id} type="number" min={0} inputMode="decimal" value={price} disabled={priceNotSet} onChange={e => setPrice(e.target.value)} />}
          </Field>
          <Checkbox checked={priceNotSet} onChange={e => setPriceNotSet(e.target.checked)}>Not set yet</Checkbox>
        </div>
      </Section>

      <Section title={`The day ${y} registration opens`} description="Parents who asked us will get an email that day." divided>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Day">
              {id => <Input id={id} type="date" value={regDay} disabled={regNotSet} onChange={e => setRegDay(e.target.value)} />}
            </Field>
            <Field label="Time" optional hint="If it opens at a set time.">
              {id => <Input id={id} type="time" value={regTime} disabled={regNotSet} onChange={e => setRegTime(e.target.value)} />}
            </Field>
          </div>
          {view.registration && <Text tone="muted" variant="small">We show {view.registration} now.</Text>}
          <Checkbox checked={regNotSet} onChange={e => setRegNotSet(e.target.checked)}>Not set yet</Checkbox>
        </div>
      </Section>

      <Section title="The rest of your listing" description={shown ? `As we have it, from your ${shown} season.` : 'As we have it.'} divided>
        <div className="space-y-6">
          <dl className="divide-y divide-line border-y border-line">
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-2 py-3 text-small">
                <dt className="text-muted">{LABELS[k]}</dt>
                <dd className="col-span-2 break-words text-ink">{k === 'camp_type' ? TYPES[String(v)] ?? String(v) : String(v)}</dd>
              </div>
            ))}
          </dl>
          {view.snapshot.sessions.length > 0 && (
            <div className="space-y-2">
              <Text variant="small" className="font-semibold">Sessions{shown ? ` (${shown})` : ''}</Text>
              <ul className="space-y-1 text-small text-muted">
                {view.snapshot.sessions.map((s, i) => <li key={i}>{sessionLine(s)}</li>)}
              </ul>
            </div>
          )}
          <Checkbox checked={restRight} onChange={e => setRestRight(e.target.checked)}>
            The name, town, ages and website above are right for {y}.
          </Checkbox>
        </div>
      </Section>

      <Section title="Anything else?" divided>
        <Field label="A note for us" optional hint="A person reads it.">
          {id => <Textarea id={id} rows={3} value={note} onChange={e => setNote(e.target.value)} />}
        </Field>
      </Section>

      <div className="space-y-3">
        {error && <Notice tone="error">{error}</Notice>}
        <Button onClick={send} disabled={busy || !canSend} size="lg" block>
          {busy ? 'Sending' : `Send ${y} to Bunkcheck`}
        </Button>
        <p className="text-center text-small text-muted">
          We&rsquo;ll email you back exactly what changed. Rather reply in your own words? Reply to the email.
        </p>
      </div>
    </Container>
  )
}
