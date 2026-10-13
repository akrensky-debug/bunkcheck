'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/auth'
import { loadFamily, type Family } from '@/lib/agent'
import { getKit, type Contact, type InfoKit } from '@/lib/kit'
import {
  bookingStatus, confirmBooking, countdown, fmtWhen, getChecklist, getQuote, openingCalendarLink, previewPackage,
  sharePackage, watchRegistration, type BookingQuote, type PackagePreview, type RegisterChecklist,
} from '@/lib/booking'
import { Button, ChoiceChip, Container, Heading, Icon, Input, Meta, Notice, Section, Text, TextLink } from '@/components/ui'

export default function RegisterPage() {
  return (
    <Suspense fallback={<Container size="narrow" className="py-16"><Text tone="muted">Loading…</Text></Container>}>
      <Register />
    </Suspense>
  )
}

function Register() {
  const { campId } = useParams<{ campId: string }>()
  const search = useSearchParams()
  const session = useSession()
  const [family, setFamily] = useState<Family | null>(null)
  const [list, setList] = useState<RegisterChecklist | null>(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const registrationId = search.get('registration')
  const sessionId = search.get('session')
  const child = search.get('child')

  async function refresh(f: Family, regId = registrationId) {
    setList(await getChecklist(f.id, { camp_id: campId, session_id: sessionId, child, registration_id: regId }))
  }

  useEffect(() => {
    if (session === undefined) return
    loadFamily().then(async f => { setFamily(f); await refresh(f) }).catch(e => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, campId, registrationId])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!family || !list) return <Container size="narrow" className="py-16"><Text tone="muted">{error || 'Loading…'}</Text></Container>

  const reg = list.registration
  const opensLater = list.opens_at && new Date(list.opens_at).getTime() > now
  const kidName = reg?.child_name || child || ''

  async function watch() {
    if (!family) return
    const r = await watchRegistration(family.id, { camp_id: campId, session_id: sessionId, child_name: child })
    window.history.replaceState(null, '', `/register/${campId}?registration=${r.id}`)
    await refresh(family, r.id)
  }
  return (
    <Container size="narrow" className="space-y-14 py-12 sm:py-16">
      <header className="space-y-3">
        <TextLink href="/registrations" tone="muted" className="text-small"><Icon name="arrow-left" size={14} />Registrations</TextLink>
        <Heading level="h1">Register for {list.camp_name}</Heading>
        <Meta parts={[kidName, list.session_name, list.price ? `$${list.price.toLocaleString()}` : null,
          list.availability && list.availability !== 'unknown' ? list.availability.charAt(0).toUpperCase() + list.availability.slice(1) : null]} />
      </header>

      <section className="space-y-5">
        {reg && (reg.status === 'registered' || reg.status === 'waitlisted') ? (
          <div className="space-y-1">
            <p className={`inline-flex items-center gap-2 font-display text-h2 ${reg.status === 'registered' ? 'text-checked' : 'text-warn'}`}>
              {reg.status === 'registered' && <Icon name="check" size={20} />}
              {reg.status === 'registered' ? 'Registered' : 'On the waitlist'}
            </p>
            <Text variant="small" tone="muted">{reg.next_step}{reg.confirmation_number ? ` Confirmation ${reg.confirmation_number}.` : ''}</Text>
          </div>
        ) : list.opens_at ? (
          <div className="space-y-1">
            <p className="font-display text-h2 text-ink">{countdown(list.opens_at, now)}</p>
            <Text variant="small" tone="muted">
              {opensLater ? 'Registration opens' : 'Registration opened'} {fmtWhen(list.opens_at)}
              {list.opens_at_source === 'family' ? ' (the date you entered)' : ' (from the camp)'}
              {list.closes_at ? ` · closes ${fmtWhen(list.closes_at)}` : ''}
            </Text>
          </div>
        ) : (
          <Text tone="muted">We don&rsquo;t have this camp&rsquo;s registration date yet. Check its site, or add the date on your Registrations page.</Text>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {list.registration_url ? (
            <Button href={list.registration_url} external icon="external" size="lg">
              Open the camp&rsquo;s registration
            </Button>
          ) : <span className="text-small text-muted">No registration link on file; use the camp&rsquo;s website.</span>}
          {opensLater && list.opens_at && reg?.status !== 'registered' && reg?.status !== 'waitlisted' && (
            <Button href={openingCalendarLink(list.camp_name, list.opens_at, list.registration_url)} external variant="secondary" size="lg" leadingIcon="calendar">
              Add an alarm to Google Calendar
            </Button>
          )}
          {!reg && (
            <Button onClick={watch} variant="secondary" size="lg">
              Track this and remind me
            </Button>
          )}
        </div>
        <p className="text-caption text-muted">You register and pay on the camp&rsquo;s own site. Bunkcheck never submits forms or payments for you.</p>
      </section>

      <Section title="Checklist" divided>
        <ol className="space-y-3">
          {list.steps.map(s => (
            <li key={s.key} className="flex gap-3 text-small">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border ${s.done ? 'border-checked bg-checked text-accent-ink' : 'border-muted'}`}>
                {s.done && <Icon name="check" size={12} label="Done" />}
              </span>
              <span className="text-ink">
                {s.text}{' '}
                {s.href && <TextLink href={s.href} target={s.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">Open</TextLink>}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <FormAnswers familyId={family.id} list={list} signedIn={!!session} kidName={kidName} />

      {session && list.kit_available && (
        <PackagePanel familyId={family.id} campId={campId} kidName={kidName} registrationId={reg?.id ?? null}
          onShared={() => refresh(family, reg?.id ?? registrationId)} sharedCount={list.shares.length} />
      )}

      {session && reg && <SandboxBooking familyId={family.id} registrationId={reg.id} onBooked={() => refresh(family, reg.id)} />}
    </Container>
  )
}

function fmtContacts(list: Contact[]): string {
  return list.map(c => [c.name, c.relationship && `(${c.relationship})`, c.phone, c.email].filter(Boolean).join(' ')).join('; ')
}

function answerFor(kit: InfoKit, field: string, kidName: string): string | null {
  const [scope, name] = field.split('.')
  if (scope === 'household') {
    const v = (kit.household as unknown as Record<string, unknown>)[name]
    if (Array.isArray(v)) return v.length ? fmtContacts(v as Contact[]) : null
    return (v as string | null) || null
  }
  const kid = kit.children.find(c => c.name.toLowerCase() === kidName.toLowerCase()) ?? (kit.children.length === 1 ? kit.children[0] : undefined)
  if (!kid) return null
  if (name === 'name') return kid.name
  return ((kid as unknown as Record<string, unknown>)[name] as string | null) || null
}

function FormAnswers({ familyId, list, signedIn, kidName }: {
  familyId: string; list: RegisterChecklist; signedIn: boolean; kidName: string
}) {
  const [kit, setKit] = useState<InfoKit | null>(null)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')

  async function show() {
    try { setKit(await getKit(familyId)) } catch (e) { setError((e as Error).message) }
  }

  function copy(q: string, text: string) {
    navigator.clipboard?.writeText(text)
    setCopied(q)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <Section
      title="What the form asks"
      divided
      action={signedIn && list.kit_available && (
        kit
          ? <Button variant="quiet" onClick={() => setKit(null)}>Hide my answers</Button>
          : <Button variant="link" onClick={show}>Show my answers to copy</Button>
      )}
    >
      <p className="mb-4 max-w-measure text-small text-muted">
        {list.form.typical
          ? "We haven't mapped this camp's form yet, so this is what most camp forms ask."
          : `From this camp's form${list.form.platform ? ` (${list.form.platform})` : ''}.`}
        {!list.kit_available && ' Sign in and fill in your info kit to have answers ready.'}
      </p>
      {error && <p className="text-small text-error">{error}</p>}
      <ul className="divide-y divide-line border-y border-line">
        {list.form.fields.map(f => {
          const answer = kit && f.kit_field ? answerFor(kit, f.kit_field, kidName) : null
          return (
            <li key={f.question} className="flex flex-wrap items-center justify-between gap-2 py-3 text-small">
              <div className="min-w-0">
                <p className="text-ink">{f.question}{!f.required && <span className="text-muted"> (optional)</span>}</p>
                {answer && <p className="text-muted break-words">{answer}</p>}
              </div>
              <span className="shrink-0">
                {answer ? (
                  <Button variant="link" onClick={() => copy(f.question, answer)}>{copied === f.question ? 'Copied' : 'Copy'}</Button>
                ) : f.kit_field === null ? (
                  <span className="text-muted">On the camp's site</span>
                ) : f.ready === true ? (
                  <span className="text-checked">In your kit</span>
                ) : f.ready === false ? (
                  <a href="/kit" className="font-semibold text-warn underline underline-offset-4">Missing{f.missing_for.length ? ` for ${f.missing_for.join(', ')}` : ''}: add it</a>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function PackagePanel({ familyId, campId, kidName, registrationId, sharedCount, onShared }: {
  familyId: string; campId: string; kidName: string; registrationId: string | null; sharedCount: number; onShared: () => void
}) {
  const [preview, setPreview] = useState<PackagePreview | null>(null)
  const [household, setHousehold] = useState<string[]>([])
  const [childFields, setChildFields] = useState<string[]>([])
  const [link, setLink] = useState('')
  const [error, setError] = useState('')

  async function prepare() {
    setError('')
    try {
      const p = await previewPackage(familyId, { camp_id: campId, children: kidName ? [kidName] : [], registration_id: registrationId })
      setPreview(p)
      setHousehold(p.household_fields)
      setChildFields(p.child_fields)
    } catch (e) { setError((e as Error).message) }
  }

  async function share() {
    if (!preview) return
    setError('')
    try {
      const res = await sharePackage(familyId, {
        camp_id: campId, children: preview.children, household_fields: household,
        child_fields: preview.children.length ? childFields : [], expires_in_days: 30,
      })
      setLink(res.url)
      onShared()
    } catch (e) { setError((e as Error).message) }
  }

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter(x => x !== v) : [...list, v])

  return (
    <Section title="Info kit package for this camp" divided className="space-y-4">
      <p className="max-w-measure text-small text-muted">
        A private link with only what this camp's form asks for. Send it to the camp if they accept it, or keep it to
        copy from. It expires in 30 days, you can withdraw it on your Info kit page, and you'll see when it's opened.
        {sharedCount > 0 && ` You've already shared ${sharedCount} with this camp.`}
      </p>
      {!preview && !link && (
        <Button variant="secondary" onClick={prepare}>Prepare a package to review</Button>
      )}
      {preview && !link && (
        <div className="space-y-4 border-y border-line py-5 text-small">
          <p className="text-ink">
            For <strong>{preview.recipient}</strong>{preview.children.length ? `, about ${preview.children.join(', ')}` : ''}. Untick anything you'd rather not send.
          </p>
          <FieldChecks title="Household" fields={preview.household_fields} labels={preview.labels} chosen={household} onToggle={v => toggle(household, setHousehold, v)} />
          {preview.children.length > 0 && (
            <FieldChecks title={`About ${preview.children.join(', ')}`} fields={preview.child_fields} labels={preview.labels} chosen={childFields} onToggle={v => toggle(childFields, setChildFields, v)} />
          )}
          {preview.missing.length > 0 && <Notice tone="warn">Your kit doesn't have: {preview.missing.join(', ')}. <a href="/kit" className="underline">Add them</a> first, or answer on the form.</Notice>}
          {preview.not_in_kit.length > 0 && <p className="text-muted">Answer on the camp's site yourself: {preview.not_in_kit.join(', ')}.</p>}
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={share} disabled={!household.length && !childFields.length}>
              Share {household.length + (preview.children.length ? childFields.length : 0)} fields with {preview.recipient}
            </Button>
            <Button variant="quiet" onClick={() => setPreview(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {link && (
        <Notice tone="warn" className="space-y-2">
          <p className="font-semibold">Copy this link now; it&rsquo;s shown only once.</p>
          <div className="flex items-center gap-2">
            <Input fieldSize="sm" readOnly aria-label="Package link" value={link} onFocus={e => e.target.select()} />
            <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(link)}>Copy</Button>
          </div>
        </Notice>
      )}
      {error && <p className="text-small text-error">{error}</p>}
    </Section>
  )
}

function FieldChecks({ title, fields, labels, chosen, onToggle }: {
  title: string; fields: string[]; labels: Record<string, string>; chosen: string[]; onToggle: (f: string) => void
}) {
  if (!fields.length) return null
  return (
    <fieldset>
      <legend className="mb-2 font-semibold text-ink">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {fields.map(f => (
          <ChoiceChip key={f} strikeWhenOff checked={chosen.includes(f)} onChange={() => onToggle(f)}>{labels[f] ?? f}</ChoiceChip>
        ))}
      </div>
    </fieldset>
  )
}

function SandboxBooking({ familyId, registrationId, onBooked }: { familyId: string; registrationId: string; onBooked: () => void }) {
  const [enabled, setEnabled] = useState(false)
  const [quote, setQuote] = useState<BookingQuote | null>(null)
  const [readTerms, setReadTerms] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { bookingStatus().then(s => setEnabled(s.enabled)).catch(() => setEnabled(false)) }, [])
  if (!enabled) return null

  async function ask() {
    setError('')
    try { setQuote(await getQuote(familyId, registrationId)) } catch (e) { setError((e as Error).message) }
  }

  async function book() {
    if (!quote) return
    setError('')
    try {
      const res = await confirmBooking(familyId, quote.attempt_id, Math.round(quote.price * 100))
      setResult(`${res.status === 'waitlisted' ? 'Added to the waitlist' : 'Booked'} (sandbox ref ${res.provider_ref}). ${res.amount_due ? `$${res.amount_due} is due to the camp.` : ''}`)
      setQuote(null)
      onBooked()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <section className="space-y-4 rounded-lg border border-dashed border-highlight p-5">
      <p className="text-small font-semibold text-warn">Sandbox prototype: test bookings only</p>
      {!quote && !result && (
        <Button variant="secondary" onClick={ask}>Get a quote through Bunkcheck</Button>
      )}
      {quote && (
        <div className="space-y-3 text-small">
          <dl className="grid grid-cols-3 gap-x-4 gap-y-1 [&_dd]:col-span-2">
            <dt className="text-muted">Seller</dt><dd>{quote.seller} (you're buying from the camp)</dd>
            <dt className="text-muted">For</dt><dd>{quote.child_name} · {quote.item}</dd>
            <dt className="text-muted">Price</dt><dd className="font-semibold">${quote.price.toLocaleString()} {quote.currency.toUpperCase()}{quote.availability === 'waitlist' ? ' (waitlist: nothing due unless a spot opens)' : ''}</dd>
            <dt className="text-muted">Held until</dt><dd>{fmtWhen(quote.expires_at)}</dd>
            <dt className="text-muted">Payment</dt><dd>Paid to the camp on its own system after booking</dd>
            <dt className="text-muted">We'll send</dt><dd>{quote.fields_to_send.join(', ')}</dd>
          </dl>
          {quote.missing.length > 0 && <Notice tone="warn">Add to your info kit first: {quote.missing.join(', ')}.</Notice>}
          <label className="flex items-start gap-2.5">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ink" checked={readTerms} onChange={e => setReadTerms(e.target.checked)} />
            <span>I've read the camp's <a href={quote.terms_url ?? '#'} target="_blank" rel="noopener noreferrer" className="underline">terms</a>. Waivers and medical forms are still mine to sign with the camp.</span>
          </label>
          <Button onClick={book} disabled={!readTerms || quote.missing.length > 0}>
            Confirm booking for ${quote.price.toLocaleString()}
          </Button>
        </div>
      )}
      {result && <p className="text-small text-checked">{result}</p>}
      {error && <p className="text-small text-error">{error}</p>}
    </section>
  )
}
