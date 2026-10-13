'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth'
import { loadFamily, type Family, type FamilyEvent } from '@/lib/agent'
import {
  KIND_LABELS, ROLE_HELP, ROLE_LABELS, assignTasks, createTasks, describeAudit, fmtDay, fmtTime,
  generateTasks, getAudit, getHousehold, inviteMember, leaveFamily, listTasks, removeMember, resetMyCalendar,
  updateMember, updateMyPrefs, updateTask, weekOf,
  type AuditEntry, type Household, type Member, type Role, type Task, type TaskKind,
} from '@/lib/household'
import { Button, Checkbox, ChoiceChip, Container, Heading, Icon, Input, Notice, Section, Select, Text, TextLink, cx } from '@/components/ui'


export default function HouseholdPage() {
  const session = useSession()
  const router = useRouter()
  const [family, setFamily] = useState<Family | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [error, setError] = useState('')

  const refresh = useCallback(async (f: Family) => {
    const fullPlan = f.role === 'owner' || f.role === 'co_parent'
    const [h, t, a] = await Promise.all([
      getHousehold(f.id), listTasks(f.id), fullPlan && f.signed_in ? getAudit(f.id) : Promise.resolve([]),
    ])
    setHousehold(h)
    setTasks(t)
    setAudit(a)
  }, [])

  useEffect(() => {
    if (session === undefined) return
    loadFamily()
      .then(async f => { setFamily(f); await refresh(f) })
      .catch(e => setError(e.message))
  }, [session, refresh])

  /** Run a change, refresh, and report whether it worked (errors show at the top of the page). */
  async function act(fn: () => Promise<unknown>): Promise<boolean> {
    if (!family) return false
    setError('')
    try {
      await fn()
      await refresh(family)
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    }
  }

  if (!family || !household) {
    return <Container className="py-16"><Text tone="muted">{error || 'Loading…'}</Text></Container>
  }

  const fullPlan = household.role === 'owner' || household.role === 'co_parent'
  const assignable = household.members.filter(m => m.role !== 'viewer')
  const you = household.you

  return (
    <Container className="space-y-14 py-12 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Heading level="h1">{fullPlan ? 'Household and jobs' : 'Your jobs'}</Heading>
          <Text tone="muted">
            {fullPlan
              ? 'Who is helping this summer, and who has each drop-off, pickup, form and payment.'
              : `You're helping as ${ROLE_LABELS[household.role].toLowerCase()}. ${household.role === 'viewer' ? 'Here is the family calendar.' : 'Here is what is yours, and the family calendar.'}`}
          </Text>
        </div>
        {fullPlan && <TextLink href="/" arrow className="text-small">Plan with the assistant</TextLink>}
      </header>

      {error && <Notice tone="error">{error}</Notice>}

      {!family.signed_in && (
        <Notice>
          To invite a partner, grandparent or nanny, first <TextLink href="/signin">save your family to an account</TextLink>.
          You can already keep a job list here.
        </Notice>
      )}

      {household.role !== 'viewer' && (
        <TaskBoard
          tasks={tasks}
          members={assignable}
          fullPlan={fullPlan}
          youId={you?.id ?? null}
          onToggle={t => act(() => updateTask(family.id, t.id, { status: t.status === 'open' ? 'done' : 'open' }))}
          onChecklist={(t, i) => act(() => updateTask(family.id, t.id, {
            checklist: t.checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c)),
          }))}
          onAssign={(ids, mid) => act(() => assignTasks(family.id, ids, mid))}
          onAdd={t => act(() => createTasks(family.id, [t]))}
        />
      )}

      <CalendarSection
        events={family.events}
        tasks={tasks}
        members={assignable}
        fullPlan={fullPlan}
        onGenerate={(eventIds, dropoff, pickup) => act(() => generateTasks(family.id, { event_ids: eventIds, dropoff_time: dropoff || null, pickup_time: pickup || null }))}
        onAssign={(ids, mid) => act(() => assignTasks(family.id, ids, mid))}
      />

      {family.signed_in && (
        <PeopleSection
          household={household}
          familyId={family.id}
          act={act}
          onLeft={() => { router.replace('/') }}
        />
      )}

      {you && <MySettings familyId={family.id} you={you} role={household.role} feed={household.my_calendar_url} act={act} />}

      {fullPlan && audit.length > 0 && (
        <Section title="Recent activity" divided>
          <ul className="space-y-2 text-small text-ink">
            {audit.slice(0, 20).map((e, i) => (
              <li key={i} className="flex gap-4">
                <span className="w-28 shrink-0 text-muted">{new Date(e.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                <span>{describeAudit(e)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Container>
  )
}

// ---------------------------------------------------------------------------
// Tasks, grouped by person and week
// ---------------------------------------------------------------------------

function TaskBoard({ tasks, members, fullPlan, youId, onToggle, onChecklist, onAssign, onAdd }: {
  tasks: Task[]
  members: Member[]
  fullPlan: boolean
  youId: string | null
  onToggle: (t: Task) => void
  onChecklist: (t: Task, i: number) => void
  onAssign: (ids: string[], memberId: string | null) => void
  onAdd: (t: { kind: TaskKind; title: string; due_date: string; due_time: string | null }) => void
}) {
  const [showDone, setShowDone] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  const visible = tasks.filter(t => showDone || t.status === 'open')
  const groups = useMemo(() => {
    const byPerson = new Map<string, { key: string; label: string; tasks: Task[] }>()
    const order = [youId, ...members.map(m => m.id), null]
    for (const key of order) {
      const label = key === null ? 'Nobody yet' : key === youId ? 'You' : members.find(m => m.id === key)?.display_name ?? ''
      byPerson.set(String(key), { key: String(key), label, tasks: [] })
    }
    for (const t of visible) {
      const k = String(t.assignee_id)
      if (!byPerson.has(k)) byPerson.set(k, { key: k, label: t.assignee_name ?? 'Someone', tasks: [] })
      byPerson.get(k)!.tasks.push(t)
    }
    return Array.from(byPerson.values()).filter(g => g.tasks.length)
  }, [visible, members, youId])

  const toggleSel = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  const openCount = tasks.filter(t => t.status === 'open').length

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <Heading level="h2">
          {fullPlan ? 'Jobs' : 'Your jobs'} <span className="text-muted">· {openCount} open</span>
        </Heading>
        <div className="flex items-center gap-6">
          <Checkbox checked={showDone} onChange={e => setShowDone(e.target.checked)}>Show done</Checkbox>
          {fullPlan && <Button variant="link" leadingIcon="plus" onClick={() => setAdding(a => !a)}>Add a job</Button>}
        </div>
      </div>

      {adding && <AddTask onAdd={t => { onAdd(t); setAdding(false) }} />}

      {fullPlan && selected.length > 0 && (
        <div className="sticky top-20 z-10 flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface px-4 py-2 text-small shadow-soft">
          <span className="font-semibold text-ink">{selected.length} selected</span>
          <span className="text-muted">Give to</span>
          <AssignSelect members={members} value={null} onChange={mid => { onAssign(selected, mid); setSelected([]) }} placeholder="Choose…" />
          <Button variant="quiet" onClick={() => setSelected([])} className="ml-auto">Clear</Button>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-small text-muted">
          {fullPlan ? 'No jobs yet. Ask the assistant to "set up the drop-offs and pickups", or make them from a camp below.' : 'Nothing assigned to you right now.'}
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map(g => (
            <div key={g.key} className="space-y-4">
              <Heading level="h3">{g.label} <span className="text-muted">· {g.tasks.filter(t => t.status === 'open').length} open</span></Heading>
              {weeks(g.tasks).map(([week, ts]) => (
                <div key={week}>
                  <div className="flex items-center justify-between border-b border-line pb-2 text-small">
                    <span className="font-semibold text-muted">Week of {fmtDay(week)}</span>
                    {fullPlan && (
                      <Button
                        variant="quiet"
                        onClick={() => setSelected(s => Array.from(new Set([...s, ...ts.filter(t => t.status === 'open').map(t => t.id)])))}
                      >
                        Select week
                      </Button>
                    )}
                  </div>
                  <ul className="divide-y divide-line">
                    {ts.map(t => (
                      <TaskRow
                        key={t.id} task={t} members={members} fullPlan={fullPlan}
                        selected={selected.includes(t.id)} onSelect={() => toggleSel(t.id)}
                        onToggle={() => onToggle(t)} onChecklist={i => onChecklist(t, i)}
                        onAssign={mid => onAssign([t.id], mid)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function weeks(tasks: Task[]): Array<[string, Task[]]> {
  const m = new Map<string, Task[]>()
  for (const t of tasks) {
    const w = weekOf(t.due_date)
    m.set(w, [...(m.get(w) ?? []), t])
  }
  return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
}

function TaskRow({ task: t, members, fullPlan, selected, onSelect, onToggle, onChecklist, onAssign }: {
  task: Task; members: Member[]; fullPlan: boolean; selected: boolean
  onSelect: () => void; onToggle: () => void; onChecklist: (i: number) => void; onAssign: (mid: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const done = t.status !== 'open'
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        {fullPlan && !done && (
          <input type="checkbox" aria-label="Select" checked={selected} onChange={onSelect} className="h-4 w-4 accent-ink" />
        )}
        <button
          onClick={onToggle}
          aria-label={done ? 'Mark not done' : 'Mark done'}
          className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border transition-colors', done ? 'border-checked bg-checked text-accent-ink' : 'border-muted hover:border-checked')}
        >
          {done && <Icon name="check" size={12} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-small ${done ? 'line-through text-muted' : 'text-ink'}`}>
            {t.title}
          </p>
          <p className="text-caption text-muted">
            {fmtDay(t.due_date)}{t.due_time ? ` · ${fmtTime(t.due_time)}` : ''} · {KIND_LABELS[t.kind]}
            {t.checklist.length > 0 && (
              <Button variant="link" size="sm" onClick={() => setOpen(o => !o)} className="ml-2">
                {t.checklist.filter(c => c.done).length}/{t.checklist.length} packed
              </Button>
            )}
            {done && t.completed_by_name && <span> · done by {t.completed_by_name}</span>}
          </p>
          {t.notes && <p className="text-caption text-muted mt-0.5">{t.notes}</p>}
        </div>
        {fullPlan && !done && <AssignSelect members={members} value={t.assignee_id} onChange={onAssign} />}
      </div>
      {open && (
        <ul className="ml-8 mt-2 grid gap-1 sm:grid-cols-2">
          {t.checklist.map((c, i) => (
            <li key={i}>
              <Checkbox checked={c.done} onChange={() => onChecklist(i)}>
                <span className={c.done ? 'text-muted line-through' : ''}>{c.item}</span>
              </Checkbox>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function AssignSelect({ members, value, onChange, placeholder = 'Nobody yet' }: {
  members: Member[]; value: string | null; onChange: (mid: string | null) => void; placeholder?: string
}) {
  return (
    <Select
      fieldSize="sm"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className="w-36"
      aria-label="Assign to"
    >
      <option value="">{placeholder}</option>
      {members.map(m => (
        <option key={m.id} value={m.id}>{m.is_you ? 'Me' : m.display_name}{m.status === 'invited' ? ' (invited)' : ''}</option>
      ))}
    </Select>
  )
}

function AddTask({ onAdd }: { onAdd: (t: { kind: TaskKind; title: string; due_date: string; due_time: string | null }) => void }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<TaskKind>('form')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  return (
    <form
      onSubmit={e => { e.preventDefault(); onAdd({ kind, title, due_date: day, due_time: time || null }) }}
      className="flex flex-wrap items-center gap-2 border-y border-line py-4"
    >
      <Input required fieldSize="sm" aria-label="Job" className="min-w-48 flex-1" placeholder="For example, pay the Riverside deposit" value={title} onChange={e => setTitle(e.target.value)} />
      <Select fieldSize="sm" aria-label="Kind" className="w-auto" value={kind} onChange={e => setKind(e.target.value as TaskKind)}>
        {(Object.keys(KIND_LABELS) as TaskKind[]).map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
      </Select>
      <Input required fieldSize="sm" aria-label="Due date" className="w-auto" type="date" value={day} onChange={e => setDay(e.target.value)} />
      <Input fieldSize="sm" aria-label="Time" className="w-auto" type="time" value={time} onChange={e => setTime(e.target.value)} />
      <Button type="submit" size="sm">Add</Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Calendar: make jobs from a camp, and hand them out
// ---------------------------------------------------------------------------

function CalendarSection({ events, tasks, members, fullPlan, onGenerate, onAssign }: {
  events: FamilyEvent[]; tasks: Task[]; members: Member[]; fullPlan: boolean
  onGenerate: (eventIds: string[], dropoff: string, pickup: string) => void
  onAssign: (ids: string[], memberId: string | null) => void
}) {
  const [dropoff, setDropoff] = useState('08:30')
  const [pickup, setPickup] = useState('15:00')
  if (!events.length) {
    return (
      <Section id="calendar" title="Family calendar" divided>
        <Text tone="muted" variant="small">Nothing on the calendar yet.</Text>
      </Section>
    )
  }
  return (
    <Section
      id="calendar"
      title="Family calendar"
      divided
      action={fullPlan && (
        <div className="flex items-center gap-2 text-small text-muted">
          <label className="flex items-center gap-2">Drop-off <Input fieldSize="sm" type="time" value={dropoff} onChange={e => setDropoff(e.target.value)} className="w-auto" /></label>
          <label className="flex items-center gap-2">Pickup <Input fieldSize="sm" type="time" value={pickup} onChange={e => setPickup(e.target.value)} className="w-auto" /></label>
        </div>
      )}
    >
      <ul className="divide-y divide-line border-y border-line">
        {events.map(e => {
          const rides = tasks.filter(t => t.event_id === e.id && (t.kind === 'dropoff' || t.kind === 'pickup') && t.status === 'open')
          const holders = Array.from(new Set(tasks.filter(t => t.event_id === e.id).map(t => t.assignee_name ?? 'nobody yet')))
          return (
            <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-48 flex-1">
                <p className="text-small font-semibold text-ink">{e.title}</p>
                <p className="text-caption text-muted">
                  {fmtDay(e.start_date)} – {fmtDay(e.end_date)}
                  {holders.length > 0 && fullPlan && <> · jobs: {holders.join(', ')}</>}
                </p>
              </div>
              {fullPlan && (rides.length === 0 ? (
                <Button variant="link" onClick={() => onGenerate([e.id], dropoff, pickup)}>
                  Make ride and packing jobs
                </Button>
              ) : (
                <label className="flex items-center gap-2 text-small text-muted">
                  All {rides.length} rides to
                  <AssignSelect members={members} value={null} placeholder="Choose…" onChange={mid => onAssign(rides.map(r => r.id), mid)} />
                </label>
              ))}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

function PeopleSection({ household, familyId, act, onLeft }: {
  household: Household; familyId: string; act: (fn: () => Promise<unknown>) => Promise<boolean>; onLeft: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Exclude<Role, 'owner'>>('caregiver')
  const [link, setLink] = useState<{ url: string; emailed: boolean } | null>(null)
  const manage = household.can_manage

  function rename(m: Member) {
    const next = prompt(m.is_you ? 'What should your household call you?' : `Rename ${m.display_name}`, m.display_name)?.trim()
    if (next && next !== m.display_name) act(() => updateMember(familyId, m.id, { display_name: next }))
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    await act(async () => {
      const res = await inviteMember(familyId, { display_name: name, email, role })
      setLink({ url: res.url, emailed: res.emailed })
      setName('')
      setEmail('')
    })
  }

  async function leave() {
    if (!confirm('Leave this family? You will lose access to its plan and calendar.')) return
    if (await act(() => leaveFamily(familyId))) onLeft()
  }

  if (household.role === 'caregiver' || household.role === 'viewer') {
    return (
      <Section title="Your access" divided className="space-y-3">
        <p className="max-w-measure text-small text-muted">{household.role === 'viewer' ? 'You can see the family calendar.' : 'You can see the jobs assigned to you and the family calendar.'} The family's medical and contact details stay private to the parents.</p>
        <Button variant="danger" onClick={leave}>Leave this family</Button>
      </Section>
    )
  }

  return (
    <Section title="People" divided className="space-y-6">
      <ul className="divide-y divide-line border-y border-line">
        {household.members.map(m => (
          <li key={m.id} className="flex flex-wrap items-center gap-4 py-3">
            <div className="min-w-40 flex-1">
              <p className="text-small font-semibold text-ink">
                {m.display_name}{m.is_you && <span className="font-normal text-muted"> (you)</span>}
                {manage && <Button variant="quiet" size="sm" onClick={() => rename(m)} className="ml-3 font-normal">Rename</Button>}
              </p>
              <p className="text-caption text-muted">
                {m.email ?? ROLE_LABELS[m.role]}
                {m.status === 'invited' && <span className="ml-1 text-muted italic">· invited{m.invite_expires_at ? `, link expires ${new Date(m.invite_expires_at).toLocaleDateString()}` : ''}</span>}
              </p>
            </div>
            {manage && m.role !== 'owner' ? (
              <>
                <Select
                  fieldSize="sm"
                  className="w-auto"
                  value={m.role}
                  onChange={e => act(() => updateMember(familyId, m.id, { role: e.target.value as Role }))}
                  aria-label={`Role for ${m.display_name}`}
                >
                  {(['co_parent', 'caregiver', 'viewer'] as const).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </Select>
                {m.role === 'co_parent' && (
                  <label className="flex items-center gap-1.5 text-caption text-muted" title="Medical, emergency contacts, insurance">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-ink"
                      checked={m.kit_access}
                      onChange={e => {
                        if (e.target.checked && !confirm(`Let ${m.display_name} see and share the info kit (medical, insurance, contacts)?`)) return
                        act(() => updateMember(familyId, m.id, { kit_access: e.target.checked }))
                      }}
                    />
                    Info kit
                  </label>
                )}
                {m.status === 'invited' && (
                  <Button variant="link" size="sm" onClick={() => act(async () => {
                    const res = await inviteMember(familyId, { display_name: m.display_name, email: m.email ?? '', role: m.role as Exclude<Role, 'owner'> })
                    setLink({ url: res.url, emailed: res.emailed })
                  })}>
                    Resend
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => confirm(`Remove ${m.display_name}? Their open jobs go back to "nobody yet".`) && act(() => removeMember(familyId, m.id))}
                >
                  Remove
                </Button>
              </>
            ) : (
              <span className="text-caption text-muted">{ROLE_LABELS[m.role]}{m.kit_access && m.role !== 'owner' ? ' · info kit' : ''}</span>
            )}
          </li>
        ))}
      </ul>

      {manage ? (
        <form onSubmit={invite} className="space-y-4">
          <Heading level="h3" as="h3">Invite someone</Heading>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input required aria-label="Name" placeholder="What you call them, like Grandma" value={name} onChange={e => setName(e.target.value)} />
            <Input required type="email" aria-label="Email" placeholder="Their email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <fieldset>
            <legend className="mb-2 text-small font-semibold text-ink">Role</legend>
            <div className="flex flex-wrap gap-2">
              {(['co_parent', 'caregiver', 'viewer'] as const).map(r => (
                <ChoiceChip key={r} type="radio" name="role" checked={role === r} onChange={() => setRole(r)}>{ROLE_LABELS[r]}</ChoiceChip>
              ))}
            </div>
            <p className="mt-2 text-caption text-muted">{ROLE_HELP[role]}</p>
          </fieldset>
          <Button type="submit">Send invite</Button>
          <p className="text-caption text-muted">They sign in with that email to accept. The link works for 7 days. The info kit stays with you unless you turn it on for a co-parent.</p>
          {link && (
            <CopyLink
              label={link.emailed ? 'Invite emailed. You can also share this link yourself:' : "Email isn't set up yet, so send them this link yourself:"}
              url={link.url}
            />
          )}
        </form>
      ) : (
        <Button variant="danger" onClick={leave}>Leave this family</Button>
      )}
    </Section>
  )
}

function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Notice className="space-y-2">
      <p className="font-semibold">{label}</p>
      <div className="flex items-center gap-2">
        <Input fieldSize="sm" readOnly aria-label="Invite link" value={url} onFocus={e => e.target.select()} />
        <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard?.writeText(url); setCopied(true) }}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </Notice>
  )
}

function MySettings({ familyId, you, role, feed, act }: {
  familyId: string; you: Member; role: Role; feed: string | null; act: (fn: () => Promise<unknown>) => Promise<boolean>
}) {
  const webcal = feed?.replace(/^https?:/, 'webcal:')
  const [copied, setCopied] = useState(false)
  return (
    <Section title="Your reminders and calendar" divided>
      <div className="space-y-4 text-small">
        {role !== 'viewer' && (
          <label className="flex flex-wrap items-center gap-3 text-ink">
            Email me my jobs
            <Select
              fieldSize="sm"
              className="w-auto"
              value={you.reminder_pref ?? 'day_before'}
              onChange={e => act(() => updateMyPrefs(familyId, { reminder_pref: e.target.value }))}
            >
              <option value="day_before">the evening before</option>
              <option value="daily">the morning of</option>
              <option value="off">never</option>
            </Select>
          </label>
        )}
        {(role === 'owner' || role === 'co_parent') && (
          <Checkbox checked={!!you.weekly_summary} onChange={e => act(() => updateMyPrefs(familyId, { weekly_summary: e.target.checked }))}>
            Sunday summary of the week ahead: who has what, and what nobody has yet
          </Checkbox>
        )}
        {feed && webcal && (
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-muted">Your own calendar: the family plan plus your jobs.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption">
              <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer" className="font-semibold text-ink hover:underline underline-offset-4">Add to Google Calendar</a>
              <a href={webcal} className="font-semibold text-ink hover:underline underline-offset-4">Apple or Outlook</a>
              <Button variant="quiet" size="sm" onClick={() => { navigator.clipboard?.writeText(feed); setCopied(true) }}>{copied ? 'Link copied' : 'Copy private link'}</Button>
              <Button variant="quiet" size="sm" onClick={() => confirm('Make a new link? The old one stops working.') && act(() => resetMyCalendar(familyId))}>Reset link</Button>
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
