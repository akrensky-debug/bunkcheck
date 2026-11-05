'use client'

import { useState } from 'react'
import type { UIData } from '@/lib/agent'
import {
  KIND_LABELS, ROLE_HELP, ROLE_LABELS, assignTasks, fmtDay, fmtTime, inviteMember, type Role, type Task,
} from '@/lib/household'
import { Button, Icon, Input, Meta, Notice, Select, TextLink } from '@/components/ui'

type Of<T extends UIData['type']> = Extract<UIData, { type: T }>

const SHOWN = 8
// Agent cards sit between hairlines in the conversation, like result lists.
const block = 'border-y border-line py-5'

function TaskLines({ tasks }: { tasks: Task[] }) {
  return (
    <ul className="space-y-1.5">
      {tasks.slice(0, SHOWN).map(t => (
        <li key={t.id} className="flex gap-3 text-small">
          <span className="w-20 shrink-0 text-muted">{KIND_LABELS[t.kind]}</span>
          <span className={`flex-1 ${t.status !== 'open' ? 'text-muted line-through' : 'text-ink'}`}>{t.title}</span>
          <span className="shrink-0 text-muted">{fmtDay(t.due_date)}{t.due_time ? ` ${fmtTime(t.due_time)}` : ''}</span>
        </li>
      ))}
      {tasks.length > SHOWN && <li className="text-caption text-muted">{tasks.length - SHOWN} more</li>}
    </ul>
  )
}

export function TasksCard({ data }: { data: Of<'tasks'> }) {
  if (!data.tasks.length) return null
  const people = Array.from(new Set(data.tasks.map(t => t.assignee_name ?? 'Nobody yet')))
  return (
    <div className={block}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-h3 text-ink">{data.title ?? 'Jobs'} <span className="text-muted">· {data.tasks.length}</span></h3>
        <TextLink href="/household" arrow className="text-small">Open the job list</TextLink>
      </div>
      <TaskLines tasks={data.tasks} />
      {people.length > 0 && <p className="mt-3 text-caption text-muted">Owners: {people.join(', ')}</p>}
    </div>
  )
}

export function HouseholdCard({ data }: { data: Of<'household'> }) {
  if (!data.members.length) return null
  return (
    <ul className="divide-y divide-line border-y border-line">
      {data.members.map(m => (
        <li key={m.id} className="flex justify-between gap-4 py-2.5 text-small">
          <span className="font-semibold text-ink">{m.name}</span>
          <span className="text-muted">{ROLE_LABELS[m.role]}{m.status === 'invited' ? ', invited' : ''}</span>
        </li>
      ))}
    </ul>
  )
}

export function AssignProposal({ data, familyId }: { data: Of<'assign_proposal'>; familyId?: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'dismissed'>('idle')
  const [error, setError] = useState('')
  async function confirm() {
    if (!familyId) return
    setState('busy')
    setError('')
    try {
      await assignTasks(familyId, data.task_ids, data.member?.id ?? null)
      setState('done')
    } catch (e) {
      setError((e as Error).message)
      setState('idle')
    }
  }
  if (state === 'dismissed') return <p className="text-small text-muted">Left as it was.</p>
  return (
    <div className={block}>
      <h3 className="mb-3 font-display text-h3 text-ink">{data.summary}?</h3>
      <TaskLines tasks={data.tasks} />
      {data.member?.status === 'invited' && (
        <Notice tone="warn" className="mt-3">{data.member.name} hasn&rsquo;t accepted the invite yet; reminders start once they do.</Notice>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {state === 'done' ? (
          <p className="inline-flex items-center gap-1.5 text-small font-semibold text-checked">
            <Icon name="check" size={14} />Done. {data.member ? `${data.member.name} will get a reminder before each one.` : ''}
          </p>
        ) : (
          <>
            <Button onClick={confirm} disabled={state === 'busy' || !familyId} size="sm">
              {state === 'busy' ? 'Assigning…' : 'Confirm'}
            </Button>
            <Button variant="quiet" onClick={() => setState('dismissed')}>Not now</Button>
          </>
        )}
        {error && <span className="text-small text-error">{error}</span>}
      </div>
    </div>
  )
}

export function InviteProposal({ data, familyId }: { data: Of<'invite_proposal'>; familyId?: string }) {
  const [email, setEmail] = useState(data.email)
  const [name, setName] = useState(data.display_name)
  const [role, setRole] = useState<Exclude<Role, 'owner'>>(data.role)
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'dismissed'>('idle')
  const [error, setError] = useState('')
  const [sent, setSent] = useState<{ url: string; emailed: boolean } | null>(null)
  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!familyId) return
    setState('busy')
    setError('')
    try {
      const res = await inviteMember(familyId, { display_name: name, email, role })
      setSent({ url: res.url, emailed: res.emailed })
      setState('done')
    } catch (err) {
      setError((err as Error).message)
      setState('idle')
    }
  }
  if (state === 'dismissed') return <p className="text-small text-muted">No invite sent.</p>
  if (state === 'done') {
    return sent?.emailed ? (
      <p className="inline-flex items-center gap-1.5 text-small font-semibold text-checked"><Icon name="check" size={14} />Invite emailed to {name} ({email}).</p>
    ) : (
      <div className="space-y-2 text-small">
        <p className="inline-flex items-center gap-1.5 font-semibold text-checked"><Icon name="check" size={14} />{name} is invited. Email isn&rsquo;t set up yet, so send them this link:</p>
        <Input readOnly value={sent?.url ?? ''} onFocus={e => e.target.select()} fieldSize="sm" />
      </div>
    )
  }
  return (
    <form onSubmit={send} className={`${block} space-y-3`}>
      <h3 className="font-display text-h3 text-ink">Invite {name} to your household?</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input required value={name} onChange={e => setName(e.target.value)} fieldSize="sm" aria-label="Name" />
        <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Their email" fieldSize="sm" aria-label="Email" />
      </div>
      <Select value={role} onChange={e => setRole(e.target.value as Exclude<Role, 'owner'>)} fieldSize="sm" aria-label="Role">
        {(['co_parent', 'caregiver', 'viewer'] as const).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}: {ROLE_HELP[r].toLowerCase()}</option>)}
      </Select>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="sm" disabled={state === 'busy' || !familyId}>{state === 'busy' ? 'Sending…' : 'Send invite'}</Button>
        <Button variant="quiet" onClick={() => setState('dismissed')}>Not now</Button>
        {error && <span className="text-small text-error">{error}</span>}
      </div>
    </form>
  )
}

export function MessageDraft({ data }: { data: Of<'message_draft'> }) {
  const [copied, setCopied] = useState(false)
  const emails = data.recipients.map(r => r.email).filter(Boolean) as string[]
  const mailto = emails.length
    ? `mailto:${emails.join(',')}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`
    : null
  return (
    <div className={block}>
      <Meta className="mb-1" parts={['Draft', `To ${data.recipients.map(r => r.name).join(', ')}`]} />
      <h3 className="mb-2 font-display text-h3 text-ink">{data.subject}</h3>
      <p className="max-w-measure whitespace-pre-wrap text-small text-ink">{data.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {mailto && <Button href={mailto} size="sm">Open in email</Button>}
        <Button variant="link" onClick={() => { navigator.clipboard?.writeText(`${data.subject}\n\n${data.body}`); setCopied(true) }}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
