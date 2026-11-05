'use client'

import { useState, type ReactNode } from 'react'
import type { FamilyProfile } from '@/lib/agent'
import type { AwayRange, BriefField, BriefKid, BriefUpdate, Chip, Question } from '@/lib/summer'
import { fmtDay } from '@/lib/summer'
import { Button, ChoiceChip, Field, Heading, Input, Stack, Text, cx } from '@/components/ui'

const INTERESTS = ['Sports', 'Swimming', 'Arts', 'Music', 'Theater', 'Science', 'Coding', 'Nature', 'Cooking', 'Dance']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

/** The answers so far, one chip each. Tapping a chip edits that answer. */
export function AnswerChips({ chips, onEdit }: { chips: Chip[]; onEdit: (f: BriefField) => void }) {
  if (!chips.length) return null
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Your answers">
      {chips.map((c, i) => (
        <li key={`${c.field}-${i}`}>
          <button
            type="button"
            onClick={() => onEdit(c.field)}
            className={cx(
              'rounded-pill border px-3 py-1 text-small transition-colors duration-150 hover:border-ink',
              c.source === 'guessed' ? 'border-dashed border-line text-muted' : 'border-line bg-surface text-ink',
            )}
          >
            {c.label}{c.source === 'guessed' && <span className="text-muted"> (guess, fix)</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** One question with Back, Skip for now and Not sure yet. Nothing here is required. */
export function QuestionCard({ question, profile, weeks, schools, busy, canGoBack, onAnswer, onSkip, onBack, onDone }: {
  question: Question
  profile: FamilyProfile & Record<string, unknown>
  weeks: string[]
  schools: string[]
  busy: boolean
  canGoBack: boolean
  onAnswer: (u: BriefUpdate) => void
  onSkip: (notSure: boolean) => void
  onBack: () => void
  onDone?: () => void
}) {
  return (
    <section aria-live="polite" className="space-y-5 border-y border-line py-6">
      <div className="space-y-1">
        {question.returning && <Text variant="small" tone="muted">Back to this one, now that it matters:</Text>}
        <Heading level="h2">{question.prompt}</Heading>
        {question.help && <Text tone="muted">{question.help}</Text>}
      </div>
      <Editor key={question.field} field={question.field} profile={profile} weeks={weeks} schools={schools}
        busy={busy} onAnswer={onAnswer} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {canGoBack && <Button variant="quiet" leadingIcon="arrow-left" onClick={onBack} disabled={busy}>Back</Button>}
        <Button variant="quiet" onClick={() => onSkip(false)} disabled={busy}>Skip for now</Button>
        <Button variant="quiet" onClick={() => onSkip(true)} disabled={busy}>Not sure yet</Button>
        {onDone && <Button variant="quiet" onClick={onDone} disabled={busy}>Close</Button>}
      </div>
    </section>
  )
}

function Save({ busy, disabled, children = 'Save' }: { busy: boolean; disabled?: boolean; children?: ReactNode }) {
  return <Button type="submit" disabled={busy || disabled}>{busy ? 'Saving' : children}</Button>
}

function Editor({ field, profile, weeks, schools, busy, onAnswer }: {
  field: BriefField
  profile: FamilyProfile & Record<string, unknown>
  weeks: string[]
  schools: string[]
  busy: boolean
  onAnswer: (u: BriefUpdate) => void
}) {
  switch (field) {
    case 'kids': return <KidsEditor kids={profile.kids ?? []} busy={busy} onAnswer={onAnswer} />
    case 'home': return <HomeEditor value={profile.home_location ?? ''} busy={busy} onAnswer={onAnswer} />
    case 'school': return <SchoolEditor value={(profile.school as string) ?? ''} schools={schools} busy={busy} onAnswer={onAnswer} />
    case 'sorted_weeks': return <WeeksEditor profile={profile} weeks={weeks} busy={busy} onAnswer={onAnswer} />
    case 'care_hours': return <HoursEditor profile={profile} busy={busy} onAnswer={onAnswer} />
    case 'interests': return <InterestsEditor kids={profile.kids ?? []} busy={busy} onAnswer={onAnswer} />
    case 'weekly_budget':
      return <NumberChoice options={[200, 300, 400, 500, 600]} format={n => `$${n}`} unit="a week" label="Weekly budget per kid"
        value={profile.weekly_budget ?? null} busy={busy} onPick={n => onAnswer({ weekly_budget: n })} />
    case 'max_drive_minutes':
      return <NumberChoice options={[10, 15, 20, 30, 45]} format={n => `${n} min`} unit="minutes" label="Longest drive, one way"
        value={(profile.max_drive_minutes as number) ?? null} busy={busy} onPick={n => onAnswer({ max_drive_minutes: n })} />
    case 'sleepaway':
      return <YesNo yes="Yes, it's an option" no="Day camp only" busy={busy} onPick={v => onAnswer({ sleepaway: v })} />
    case 'booked_elsewhere':
      return <YesNo yes="Yes, some weeks" no="Nothing yet" busy={busy} onPick={v => onAnswer({ booked_elsewhere: v })} />
  }
}

function KidsEditor({ kids, busy, onAnswer }: { kids: BriefKid[]; busy: boolean; onAnswer: (u: BriefUpdate) => void }) {
  const [rows, setRows] = useState<Array<{ name: string; age: string; rest: BriefKid }>>(
    kids.length ? kids.map(k => ({ name: k.name ?? '', age: k.age != null ? String(k.age) : '', rest: k }))
      : [{ name: '', age: '', rest: {} }],
  )
  const set = (i: number, patch: Partial<{ name: string; age: string }>) =>
    setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const valid = rows.filter(r => r.name.trim())
  return (
    <form className="space-y-4" onSubmit={e => {
      e.preventDefault()
      onAnswer({ kids: valid.map(r => ({ ...r.rest, name: r.name.trim(), age: r.age === '' ? null : Number(r.age) })) })
    }}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-end gap-3">
          <Field label="First name" className="flex-1">
            {id => <Input id={id} value={r.name} autoComplete="off" onChange={e => set(i, { name: e.target.value })} />}
          </Field>
          <Field label="Age" className="w-24">
            {id => <Input id={id} type="number" min={0} max={19} inputMode="numeric" value={r.age}
              onChange={e => set(i, { age: e.target.value })} />}
          </Field>
          {rows.length > 1 && (
            <Button variant="danger" onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}>Remove</Button>
          )}
        </div>
      ))}
      <Stack row gap={4} align="center" wrap>
        <Save busy={busy} disabled={!valid.length} />
        <Button variant="link" leadingIcon="plus" onClick={() => setRows(rs => [...rs, { name: '', age: '', rest: {} }])}>
          Add another
        </Button>
      </Stack>
      <Text variant="caption" tone="muted">First names only. Medical and allergy details go in your info kit, not here.</Text>
    </form>
  )
}

function HomeEditor({ value, busy, onAnswer }: { value: string; busy: boolean; onAnswer: (u: BriefUpdate) => void }) {
  const [town, setTown] = useState(value)
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => {
      e.preventDefault()
      const t = town.trim()
      onAnswer({ home_location: /,\s*[A-Za-z]{2}$/.test(t) ? t : `${t}, RI` })
    }}>
      <Field label="Town" className="min-w-0 flex-1">
        {id => <Input id={id} value={town} placeholder="Providence, RI" autoComplete="address-level2"
          onChange={e => setTown(e.target.value)} />}
      </Field>
      <Save busy={busy} disabled={!town.trim()} />
    </form>
  )
}

function SchoolEditor({ value, schools, busy, onAnswer }: {
  value: string; schools: string[]; busy: boolean; onAnswer: (u: BriefUpdate) => void
}) {
  const known = schools.includes(value)
  const [pick, setPick] = useState(known ? value : value ? 'other' : '')
  const [other, setOther] = useState(known ? '' : value)
  const [dates, setDates] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const school = pick === 'other' ? other.trim() : pick
  return (
    <form className="space-y-4" onSubmit={e => {
      e.preventDefault()
      onAnswer(dates && start && end ? { ...(school ? { school } : {}), summer_start: start, summer_end: end } : { school })
    }}>
      <div className="flex flex-wrap gap-2">
        {schools.map(s => (
          <ChoiceChip key={s} type="radio" name="school" checked={pick === s} onChange={() => setPick(s)}>{s}</ChoiceChip>
        ))}
        <ChoiceChip type="radio" name="school" checked={pick === 'other'} onChange={() => setPick('other')}>Another school</ChoiceChip>
      </div>
      {pick === 'other' && (
        <Field label="School name" hint="We'll guess the dates for now; you can fix them any time.">
          {id => <Input id={id} value={other} onChange={e => setOther(e.target.value)} />}
        </Field>
      )}
      {dates ? (
        <div className="flex flex-wrap gap-3">
          <Field label="First day of summer">{id => <Input id={id} type="date" value={start} onChange={e => setStart(e.target.value)} />}</Field>
          <Field label="Last day of summer">{id => <Input id={id} type="date" value={end} onChange={e => setEnd(e.target.value)} />}</Field>
        </div>
      ) : (
        <Button variant="link" onClick={() => setDates(true)}>I know our summer dates</Button>
      )}
      <Save busy={busy} disabled={!school && !(dates && start && end)} />
    </form>
  )
}

function inRange(week: string, a: { start_date: string; end_date: string }) {
  return a.start_date <= week && a.end_date >= week
}

function addDays(day: string, n: number) {
  const d = new Date(day + 'T00:00:00Z')  // UTC, so the date never shifts with the time zone
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const friday = (week: string) => addDays(week, 4)

function WeeksEditor({ profile, weeks, busy, onAnswer }: {
  profile: FamilyProfile; weeks: string[]; busy: boolean; onAnswer: (u: BriefUpdate) => void
}) {
  const away = profile.away ?? []
  const [picked, setPicked] = useState<Set<string>>(
    new Set(weeks.filter(w => away.some(a => !a.child_name && (inRange(w, a) || inRange(friday(w), a))))),
  )
  const [label, setLabel] = useState(away[0]?.label ?? 'Away')
  if (!weeks.length) {
    return <Text tone="muted">Once we know your summer dates, tap the weeks here.</Text>
  }
  const toggle = (w: string) => setPicked(p => {
    const n = new Set(p)
    if (n.has(w)) n.delete(w)
    else n.add(w)
    return n
  })
  return (
    <form className="space-y-4" onSubmit={e => {
      e.preventDefault()
      const keepOthers = away.filter(a => a.child_name)  // trips for one kid stay as they were
      // Back-to-back weeks become one trip.
      const ranges: AwayRange[] = []
      for (const w of Array.from(picked).sort()) {
        const last = ranges[ranges.length - 1]
        if (last && friday(addDays(w, -7)) === last.end_date) last.end_date = friday(w)
        else ranges.push({ start_date: w, end_date: friday(w), label: label.trim() || 'Away' })
      }
      onAnswer({ away: [...keepOthers, ...ranges] })
    }}>
      <Text variant="small" tone="muted">Tap the weeks you won&rsquo;t need camp: vacation, family, a camp already booked.</Text>
      <div className="flex flex-wrap gap-2">
        {weeks.map(w => (
          <ChoiceChip key={w} checked={picked.has(w)} onChange={() => toggle(w)}>{fmtDay(w)}</ChoiceChip>
        ))}
      </div>
      {picked.size > 0 && (
        <Field label="What is it?" className="max-w-xs">
          {id => <Input id={id} value={label} onChange={e => setLabel(e.target.value)} placeholder="Cape Cod, Grandma's" />}
        </Field>
      )}
      <Stack row gap={4} align="center" wrap>
        <Save busy={busy}>{picked.size ? `Save ${picked.size} week${picked.size === 1 ? '' : 's'}` : 'None yet'}</Save>
      </Stack>
    </form>
  )
}

function HoursEditor({ profile, busy, onAnswer }: { profile: FamilyProfile; busy: boolean; onAnswer: (u: BriefUpdate) => void }) {
  const current = profile.work_schedule?.[0]
  const [custom, setCustom] = useState(false)
  const [start, setStart] = useState(current?.start?.padStart(5, '0') ?? '08:00')
  const [end, setEnd] = useState(current?.end?.padStart(5, '0') ?? '18:00')
  const save = (s: string, e: string) =>
    onAnswer({ work_schedule: [{ parent: 'Parents', days: WEEKDAYS, start: s, end: e }] })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={busy} onClick={() => save('8:00', '18:00')}>About 8 to 6</Button>
        <Button variant="secondary" disabled={busy} onClick={() => save('9:00', '17:00')}>About 9 to 5</Button>
        <Button variant="secondary" disabled={busy} onClick={() => save('7:30', '17:30')}>About 7:30 to 5:30</Button>
        <Button variant="link" onClick={() => setCustom(true)}>Other hours</Button>
      </div>
      {custom && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); save(start, end) }}>
          <Field label="Care from">{id => <Input id={id} type="time" value={start} onChange={e => setStart(e.target.value)} />}</Field>
          <Field label="Until">{id => <Input id={id} type="time" value={end} onChange={e => setEnd(e.target.value)} />}</Field>
          <Save busy={busy} />
        </form>
      )}
      <Text variant="caption" tone="muted">Weekdays, when nobody is home. You can set each parent&rsquo;s hours in chat.</Text>
    </div>
  )
}

function InterestsEditor({ kids, busy, onAnswer }: { kids: BriefKid[]; busy: boolean; onAnswer: (u: BriefUpdate) => void }) {
  const [picked, setPicked] = useState<string[][]>(kids.map(k => k.interests ?? []))
  const [extra, setExtra] = useState<string[]>(kids.map(() => ''))
  const toggle = (i: number, tag: string) => setPicked(p => p.map((tags, j) =>
    j !== i ? tags : tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]))
  if (!kids.length) return <Text tone="muted">Add your kids first.</Text>
  return (
    <form className="space-y-6" onSubmit={e => {
      e.preventDefault()
      onAnswer({ kids: kids.map((k, i) => ({
        ...k, interests: [...picked[i], ...extra[i].split(',').map(s => s.trim()).filter(Boolean)],
      })) })
    }}>
      {kids.map((k, i) => (
        <div key={i} className="space-y-2">
          {kids.length > 1 && <Text variant="small" className="font-semibold">{k.name || `Kid ${i + 1}`}</Text>}
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...INTERESTS, ...picked[i]])).map(tag => (
              <ChoiceChip key={tag} checked={picked[i].includes(tag)} onChange={() => toggle(i, tag)}>{tag}</ChoiceChip>
            ))}
          </div>
          <Input fieldSize="sm" aria-label={`Something else ${k.name ?? ''} likes`} placeholder="Something else"
            value={extra[i]} onChange={e => setExtra(x => x.map((v, j) => (j === i ? e.target.value : v)))} className="max-w-xs" />
        </div>
      ))}
      <Save busy={busy} />
    </form>
  )
}

function NumberChoice({ options, format, unit, label, value, busy, onPick }: {
  options: number[]; format: (n: number) => string; unit: string; label: string
  value: number | null; busy: boolean; onPick: (n: number) => void
}) {
  const [other, setOther] = useState(value != null && !options.includes(value) ? String(value) : '')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map(n => (
          <Button key={n} variant={value === n ? 'primary' : 'secondary'} disabled={busy} onClick={() => onPick(n)}>
            {format(n)}
          </Button>
        ))}
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); if (other) onPick(Number(other)) }}>
        <Field label={label} hint={unit}>
          {id => <Input id={id} type="number" min={0} inputMode="numeric" value={other} onChange={e => setOther(e.target.value)} className="w-32" />}
        </Field>
        <Save busy={busy} disabled={!other} />
      </form>
    </div>
  )
}

function YesNo({ yes, no, busy, onPick }: { yes: string; no: string; busy: boolean; onPick: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" disabled={busy} onClick={() => onPick(true)}>{yes}</Button>
      <Button variant="secondary" disabled={busy} onClick={() => onPick(false)}>{no}</Button>
    </div>
  )
}
