'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/lib/auth'
import { loadFamily, type Family } from '@/lib/agent'
import {
  PAY_LABEL, STATUS_LABEL, STATUS_TONE, countdown, deleteRegistration, fmtDay, fmtWhen, getReminderPrefs,
  listRegistrations, previewReminders, saveReminderPrefs, updateRegistration,
  type Registration, type RegistrationUpdate, type ReminderPreview, type ReminderPrefs,
} from '@/lib/booking'
import { Button, Checkbox, ChoiceChip, Container, EmptyState, Field, Heading, Input, Meta, Section, Select, Text, TextLink, cx } from '@/components/ui'


export default function RegistrationsPage() {
  const session = useSession()
  const [family, setFamily] = useState<Family | null>(null)
  const [regs, setRegs] = useState<Registration[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session === undefined) return
    loadFamily()
      .then(async f => { setFamily(f); setRegs(await listRegistrations(f.id)) })
      .catch(e => setError(e.message))
  }, [session])

  const replace = (r: Registration) => setRegs(rs => (rs ?? []).map(x => (x.id === r.id ? r : x)))

  if (!family || !regs) {
    return <Container size="narrow" className="py-16"><Text tone="muted">{error || 'Loading…'}</Text></Container>
  }

  const active = regs.filter(r => r.status !== 'cancelled')
  const cancelled = regs.filter(r => r.status === 'cancelled')

  return (
    <Container size="narrow" className="space-y-14 py-12 sm:py-16">
      <header className="space-y-3">
        <Heading level="h1">Registrations</Heading>
        <Text tone="muted">
          Camps you&rsquo;re watching and the ones you&rsquo;ve signed up for. You register and pay on each camp&rsquo;s own
          site; record it here and your calendar and reminders keep up.
        </Text>
        {session && <TextLink href="/kit" arrow className="text-small">Your info kit</TextLink>}
      </header>

      {active.length === 0 ? (
        <EmptyState
          className="border-y border-line"
          title="Nothing tracked yet"
          description={<>On a camp&rsquo;s page, choose <strong className="text-ink">Get ready to register</strong>, or ask the assistant to watch a camp for you.</>}
        />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {active.map(r => (
            <RegistrationCard key={r.id} familyId={family.id} reg={r} onChange={replace}
              onRemove={() => setRegs(rs => (rs ?? []).filter(x => x.id !== r.id))} />
          ))}
        </ul>
      )}

      {cancelled.length > 0 && (
        <details className="text-small text-muted">
          <summary className="cursor-pointer hover:text-ink">{cancelled.length} cancelled</summary>
          <ul className="mt-2 space-y-1">
            {cancelled.map(r => <li key={r.id}>{r.camp_name}{r.child_name ? ` · ${r.child_name}` : ''}</li>)}
          </ul>
        </details>
      )}

      {session ? (
        <ReminderSettings familyId={family.id} />
      ) : (
        <Section title="Reminders" divided>
          <Text tone="muted" variant="small">
            <TextLink href="/signin">Sign in</TextLink> to get an email before registration
            opens and before payments and forms are due.
          </Text>
        </Section>
      )}
    </Container>
  )
}

function RegistrationCard({ familyId, reg, onChange, onRemove }: {
  familyId: string; reg: Registration; onChange: (r: Registration) => void; onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const opens = reg.status === 'watching' && reg.opens_at
  return (
    <li className="space-y-3 py-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <a href={`/camps/${reg.camp_id}`} className="font-display text-h3 text-ink hover:underline underline-offset-4">{reg.camp_name}</a>
          <Meta parts={[reg.child_name, reg.session_name,
            reg.start_date && reg.end_date ? `${fmtDay(reg.start_date)} – ${fmtDay(reg.end_date)}` : null]} />
          {!reg.child_name && !reg.session_name && !reg.start_date && <p className="text-small text-muted">Any session</p>}
        </div>
        <div className="flex flex-wrap items-start gap-x-3 text-small font-semibold">
          <span className={STATUS_TONE[reg.status]}>{STATUS_LABEL[reg.status]}</span>
          {reg.status !== 'watching' && (
            <span className={reg.payment_status === 'paid' ? 'text-checked' : 'text-muted'}>
              {PAY_LABEL[reg.payment_status]}{reg.amount_paid ? ` · $${reg.amount_paid.toLocaleString()}` : ''}
            </span>
          )}
        </div>
      </div>

      {opens && (
        <div className="flex flex-wrap items-baseline gap-x-3 text-small">
          <span className="font-semibold text-ink">{countdown(reg.opens_at!)}</span>
          <span className="text-muted">
            {fmtWhen(reg.opens_at!)}{reg.opens_at_source === 'family' ? ' (your date)' : ''}
          </span>
        </div>
      )}
      {!opens && <p className="text-small text-ink">{reg.next_step}</p>}

      <div className="flex flex-wrap items-center gap-5">
        {reg.status !== 'registered' || reg.payment_status !== 'paid' ? (
          <Button href={`/register/${reg.camp_id}?registration=${reg.id}`} size="sm">
            {reg.status === 'watching' ? 'Register-now checklist' : 'Checklist'}
          </Button>
        ) : null}
        <Button variant="link" onClick={() => setEditing(e => !e)}>
          {editing ? 'Close' : reg.status === 'watching' ? 'I registered' : 'Update'}
        </Button>
        <Button variant="quiet" onClick={async () => {
          if (!confirm(`Stop tracking ${reg.camp_name}? Its dates come off your calendar.`)) return
          await deleteRegistration(familyId, reg.id)
          onRemove()
        }}>Stop tracking</Button>
      </div>

      {editing && <RecordForm familyId={familyId} reg={reg} onSaved={r => { onChange(r); setEditing(false) }} />}
    </li>
  )
}

function RecordForm({ familyId, reg, onSaved }: { familyId: string; reg: Registration; onSaved: (r: Registration) => void }) {
  const [form, setForm] = useState<RegistrationUpdate>({
    status: reg.status === 'watching' ? 'registered' : reg.status,
    payment_status: reg.payment_status,
    amount_paid: reg.amount_paid, paid_on: reg.paid_on, balance_due: reg.balance_due,
    payment_due_date: reg.payment_due_date, forms_due_date: reg.forms_due_date,
    confirmation_number: reg.confirmation_number,
  })
  const [error, setError] = useState('')
  const set = (k: keyof RegistrationUpdate, v: unknown) => setForm(f => ({ ...f, [k]: v === '' ? null : v }))
  const num = (v: string) => (v === '' ? null : Number(v))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try { onSaved(await updateRegistration(familyId, reg.id, form)) } catch (err) { setError((err as Error).message) }
  }

  return (
    <form onSubmit={save} className="grid gap-4 border-t border-line pt-5 text-small sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 font-semibold text-ink">
        <span>Status</span>
        <Select fieldSize="sm" className="font-normal" value={form.status} onChange={e => set('status', e.target.value)}>
          <option value="registered">Registered</option>
          <option value="waitlisted">On the waitlist</option>
          <option value="cancelled">Cancelled</option>
          <option value="watching">Not yet</option>
        </Select>
      </label>
      <label className="flex flex-col gap-1.5 font-semibold text-ink">
        <span>Payment</span>
        <Select fieldSize="sm" className="font-normal" value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
          <option value="unpaid">Not paid</option>
          <option value="deposit">Deposit paid</option>
          <option value="paid">Paid in full</option>
          <option value="refunded">Refunded</option>
        </Select>
      </label>
      <label className="flex flex-col gap-1.5 font-semibold text-ink">
        <span>Amount paid ($)</span>
        <Input type="number" min={0} step="0.01" fieldSize="sm" className="font-normal" value={form.amount_paid ?? ''} onChange={e => set('amount_paid', num(e.target.value))} />
      </label>
      <label className="flex flex-col gap-1.5 font-semibold text-ink">
        <span>Paid on</span>
        <Input type="date" fieldSize="sm" className="font-normal" value={form.paid_on ?? ''} onChange={e => set('paid_on', e.target.value)} />
      </label>
      {form.payment_status !== 'paid' && (
        <>
          <label className="flex flex-col gap-1.5 font-semibold text-ink">
            <span>Still owed ($)</span>
            <Input type="number" min={0} step="0.01" fieldSize="sm" className="font-normal" value={form.balance_due ?? ''} onChange={e => set('balance_due', num(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1.5 font-semibold text-ink">
            <span>Payment due</span>
            <Input type="date" fieldSize="sm" className="font-normal" value={form.payment_due_date ?? ''} onChange={e => set('payment_due_date', e.target.value)} />
          </label>
        </>
      )}
      <label className="flex flex-col gap-1.5 font-semibold text-ink">
        <span>Forms due (medical, waiver)</span>
        <Input type="date" fieldSize="sm" className="font-normal" value={form.forms_due_date ?? ''} onChange={e => set('forms_due_date', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 font-semibold text-ink">
        <span>Confirmation number</span>
        <Input fieldSize="sm" className="font-normal" value={form.confirmation_number ?? ''} onChange={e => set('confirmation_number', e.target.value)} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit">Save</Button>
        {error && <span className="text-error">{error}</span>}
      </div>
    </form>
  )
}

const OPEN_CHOICES: Array<[number, string]> = [[7, 'A week before'], [3, '3 days before'], [1, 'The day before'], [0, 'The morning of']]
const DEADLINE_CHOICES: Array<[number, string]> = [[7, 'A week before'], [3, '3 days before'], [1, 'The day before'], [0, 'On the day']]

function ReminderSettings({ familyId }: { familyId: string }) {
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null)
  const [today, setToday] = useState<ReminderPreview[]>([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    getReminderPrefs(familyId).then(setPrefs).catch(() => setPrefs(null))
    previewReminders(familyId).then(setToday).catch(() => setToday([]))
  }, [familyId])

  if (!prefs) return null
  const toggle = (key: 'opens_days' | 'deadline_days', d: number) =>
    setPrefs(p => p && ({ ...p, [key]: p[key].includes(d) ? p[key].filter(x => x !== d) : [...p[key], d] }))

  async function save() {
    if (!prefs) return
    setStatus('Saving…')
    try {
      setPrefs(await saveReminderPrefs(familyId, prefs))
      setToday(await previewReminders(familyId))
      setStatus('Saved.')
    } catch (e) { setStatus((e as Error).message) }
  }

  return (
    <Section title="Reminders" divided description="One email, only when something is coming up. It names the camp and the date, never anything from your info kit." className="space-y-5">
      <Checkbox checked={prefs.enabled} onChange={e => setPrefs({ ...prefs, enabled: e.target.checked })}>
        Email me registration reminders
      </Checkbox>
      {prefs.enabled && (
        <div className="space-y-5 text-small">
          <Field label="Send to" className="max-w-sm">
            {id => <Input id={id} fieldSize="sm" type="email" value={prefs.email ?? ''} onChange={e => setPrefs({ ...prefs, email: e.target.value || null })} />}
          </Field>
          <DayChoices label="Before registration opens" choices={OPEN_CHOICES} chosen={prefs.opens_days} onToggle={d => toggle('opens_days', d)} />
          <DayChoices label="Before payments and forms are due" choices={DEADLINE_CHOICES} chosen={prefs.deadline_days} onToggle={d => toggle('deadline_days', d)} />
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={save}>Save reminders</Button>
        {status && <span className="text-small text-muted">{status}</span>}
      </div>
      <div className="text-small">
        <p className="font-semibold text-ink">Going out today</p>
        {today.length ? (
          <ul className="mt-1 space-y-1 text-muted">{today.map((t, i) => <li key={i}>{t.text}</li>)}</ul>
        ) : <p className="text-muted">Nothing due today.</p>}
      </div>
    </Section>
  )
}

function DayChoices({ label, choices, chosen, onToggle }: {
  label: string; choices: Array<[number, string]>; chosen: number[]; onToggle: (d: number) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map(([d, text]) => (
          <ChoiceChip key={d} checked={chosen.includes(d)} onChange={() => onToggle(d)}>{text}</ChoiceChip>
        ))}
      </div>
    </fieldset>
  )
}
