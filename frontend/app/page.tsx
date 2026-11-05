'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Events, captureAssistantArrival, track } from '@/lib/analytics'
import {
  loadFamily, resetCalendarLink, streamChat,
  type AgentEvent, type Family, type UIData,
} from '@/lib/agent'
import { AgentBlock, AgentText, CalendarList } from '@/components/agent/AgentBlocks'
import { WeekView } from '@/components/agent/ActivityBlocks'
import { getFamilyWeek, type FamilyWeek } from '@/lib/activities'
import { Button, Composer, IconButton, cx } from '@/components/ui'

type Part =
  | { kind: 'text'; text: string }
  | { kind: 'ui'; data: UIData }

interface Message {
  role: 'user' | 'assistant'
  parts: Part[]
  status?: string   // current tool label while the turn is running
  error?: string
}

const STARTERS = [
  'Find a STEM day camp near Providence for my 8-year-old',
  'I need full-day coverage for two kids for all of July',
  'Swim lessons after 3:30 on weekdays for my 5-year-old near Providence',
  'Help me plan our whole summer',
]

/** What the side column has to show. Empty sections are not rendered at all. */
function hasProfile(f: Family | null) {
  return !!(f && (f.profile.kids?.length || f.profile.home_location))
}

export default function AgentHome() {
  const [family, setFamily] = useState<Family | null>(null)
  const [familyError, setFamilyError] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    loadFamily()
      .then(f => {
        // Caregivers and viewers see their jobs and the calendar, not the planning chat.
        if (f.role === 'caregiver' || f.role === 'viewer') router.replace('/household')
        else setFamily(f)
      })
      .catch(() => setFamilyError(true))
    // Arriving from ChatGPT or another assistant: pre-fill what the parent was asking for.
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) setInput(q.slice(0, 1000))
    captureAssistantArrival(params, !!q)
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [messages])

  function updateLast(fn: (m: Message) => Message) {
    setMessages(prev => [...prev.slice(0, -1), fn(prev[prev.length - 1])])
  }

  function handleEvent(e: AgentEvent) {
    switch (e.type) {
      case 'conversation':
        setConversationId(e.id)
        break
      case 'text':
        updateLast(m => {
          const parts = [...m.parts]
          const last = parts[parts.length - 1]
          if (last?.kind === 'text') parts[parts.length - 1] = { kind: 'text', text: last.text + e.text }
          else parts.push({ kind: 'text', text: e.text })
          return { ...m, parts, status: undefined }
        })
        break
      case 'tool_start':
        updateLast(m => ({ ...m, status: e.label }))
        break
      case 'ui':
        if (e.data.type === 'profile') {
          const profile = e.data.profile
          setFamily(f => (f ? { ...f, profile } : f))
        } else if (e.data.type === 'calendar' || e.data.type === 'week') {
          const events = e.data.events
          setFamily(f => (f ? { ...f, events } : f))
        }
        updateLast(m => ({ ...m, parts: [...m.parts, { kind: 'ui', data: e.data }] }))
        break
      case 'error':
        updateLast(m => ({ ...m, error: e.message, status: undefined }))
        break
      case 'done':
        updateLast(m => ({ ...m, status: undefined }))
        break
    }
  }

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy || !family) return
    setInput('')
    setBusy(true)
    setMessages(prev => [
      ...prev,
      { role: 'user', parts: [{ kind: 'text', text: message }] },
      { role: 'assistant', parts: [], status: 'Thinking' },
    ])
    track('agent_message_sent', { conversation_id: conversationId, first: !conversationId })
    try {
      await streamChat({ family_id: family.id, conversation_id: conversationId, message }, handleEvent)
    } catch {
      updateLast(m => ({ ...m, error: 'Connection lost. Please try again.', status: undefined }))
    } finally {
      setBusy(false)
    }
  }

  function newConversation() {
    setMessages([])
    setConversationId(null)
  }

  const empty = messages.length === 0
  const side = !!family && (hasProfile(family) || family.events.length > 0)

  return (
    <div className="mx-auto flex max-w-wide gap-16 px-4 sm:px-6">
      {/* Conversation */}
      <section className="flex min-h-page min-w-0 flex-1 flex-col">
        {(side || !empty) && (
          <div className={cx('flex items-center justify-between gap-4 pt-4', side && 'lg:hidden')}>
            {side ? (
              <Button variant="link" size="sm" onClick={() => setPanelOpen(o => !o)} aria-expanded={panelOpen}>
                {panelOpen ? 'Hide your family' : 'Your family and calendar'}
              </Button>
            ) : <span />}
            {!empty && <Button variant="quiet" size="sm" onClick={newConversation}>New chat</Button>}
          </div>
        )}
        {panelOpen && side && family && (
          <div className="mt-4 border-b border-line pb-6 lg:hidden"><FamilyPanel family={family} onChange={setFamily} /></div>
        )}

        {empty ? (
          <div className="mx-auto flex w-full max-w-narrow flex-1 flex-col pb-16 pt-16 sm:pt-24 lg:pt-32">
            <h1 className="font-display text-display text-ink text-balance">Summer, sorted.</h1>
            <p className="mt-5 max-w-measure text-lead text-muted">
              Tell me about your kids and your summer. I&rsquo;ll find the best camps, fit them into your weeks,
              and help you sign up.
            </p>
            <div className="mt-10">
              <Composer
                size="hero"
                value={input}
                onChange={setInput}
                onSubmit={() => send(input)}
                canSend={!!family}
                busy={busy}
                placeholder="Ages, town, and the weeks you need"
                label="Tell Bunkcheck about your summer"
              />
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Try asking">
              {STARTERS.map(s => (
                <li key={s}>
                  <button
                    onClick={() => send(s)}
                    disabled={!family}
                    className="text-left text-small text-muted underline-offset-4 transition-colors hover:text-ink hover:underline disabled:opacity-50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            {familyError && (
              <p className="mt-6 text-small text-error">We couldn&rsquo;t connect right now. Please refresh to try again.</p>
            )}
            {family && !side && <QuickLinks family={family} className="mt-16 lg:mt-24" />}
          </div>
        ) : (
          <>
            <div className="mx-auto w-full max-w-narrow flex-1 space-y-10 py-8">
              {messages.map((m, i) => <MessageView key={i} message={m} familyId={family?.id} />)}
              <div ref={bottomRef} className="scroll-mb-28" />
            </div>
            <div className="sticky bottom-0 bg-bg pb-4 pt-2">
              <div className="mx-auto w-full max-w-narrow">
                <Composer
                  value={input}
                  onChange={setInput}
                  onSubmit={() => send(input)}
                  canSend={!!family}
                  busy={busy}
                  placeholder="Reply"
                />
              </div>
            </div>
          </>
        )}
      </section>

      {/* Family column (desktop), only once there is something in it */}
      {side && family && (
        <aside className="hidden w-72 shrink-0 py-10 lg:block">
          <div className="sticky top-24 space-y-6">
            {!empty && <Button variant="quiet" size="sm" leadingIcon="plus" onClick={newConversation}>New chat</Button>}
            <FamilyPanel family={family} onChange={setFamily} />
          </div>
        </aside>
      )}
    </div>
  )
}

/** Quiet links to the family pages, shown instead of empty panels. */
function QuickLinks({ family, className }: { family: Family; className?: string }) {
  const links: Array<[string, string]> = [['/household', 'Household'], ['/household#calendar', 'Calendar']]
  if (family.can_open_kit) links.push(['/kit', 'Info kit'])
  else if (!family.signed_in) links.push(['/signin', 'Save to an account'])
  return (
    <nav aria-label="Your family" className={cx('text-small text-muted', className)}>
      {links.map(([href, label], i) => (
        <span key={href}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <a href={href} className="transition-colors hover:text-ink">{label}</a>
        </span>
      ))}
    </nav>
  )
}

function MessageView({ message, familyId }: { message: Message; familyId?: string }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="ml-12 whitespace-pre-wrap rounded-lg bg-accent px-4 py-2.5 text-accent-ink">
          {message.parts.map(p => (p.kind === 'text' ? p.text : '')).join('')}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-6 text-ink">
      {message.parts.map((p, i) =>
        p.kind === 'text' ? <AgentText key={i} text={p.text} /> : <AgentBlock key={i} data={p.data} familyId={familyId} />,
      )}
      {message.status && (
        <p className="flex items-center gap-2 text-small text-muted">
          <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-pill bg-ink" />
          {message.status}…
        </p>
      )}
      {message.error && <p className="text-small text-error">{message.error}</p>}
    </div>
  )
}

function PanelSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-small font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function FamilyPanel({ family, onChange }: { family: Family; onChange: (f: Family) => void }) {
  const { profile, events } = family
  const feed = family.calendar_url
  const webcal = feed?.replace(/^https?:/, 'webcal:')
  const [copied, setCopied] = useState(false)

  async function resetLink() {
    if (!confirm('Anyone using the current calendar link will lose access. Make a new link?')) return
    onChange(await resetCalendarLink(family.id))
    setCopied(false)
  }

  return (
    <div className="space-y-5">
      {hasProfile(family) && (
        <PanelSection title="Your family">
          <div className="space-y-1 text-small text-ink">
            {profile.home_location && <p>{profile.home_location}</p>}
            {profile.kids?.map((k, i) => (
              <p key={i}>
                {k.name || 'Child'}{k.age != null ? `, ${k.age}` : ''}
                {k.interests?.length ? <span className="text-muted"> · {k.interests.join(', ')}</span> : null}
              </p>
            ))}
            {profile.summer_start && profile.summer_end && (
              <p className="text-muted">Summer {profile.summer_start} to {profile.summer_end}</p>
            )}
            {profile.weekly_budget != null && <p className="text-muted">Up to ${profile.weekly_budget} a week</p>}
            {profile.needs?.map((n, i) => <p key={i} className="text-muted">{n}</p>)}
          </div>
        </PanelSection>
      )}

      <ThisWeek familyId={family.id} events={events} />

      {events.length > 0 && (
        <PanelSection title="Family calendar">
          <CalendarList events={events} compact />
          {feed && webcal && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption">
              <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer" onClick={() => Events.calendarSubscribed('google')} className="font-semibold text-ink hover:underline underline-offset-4">
                Add to Google Calendar
              </a>
              <a href={webcal} onClick={() => Events.calendarSubscribed('webcal')} className="font-semibold text-ink hover:underline underline-offset-4">Apple or Outlook</a>
              <Button variant="quiet" size="sm" onClick={() => { navigator.clipboard?.writeText(feed); setCopied(true); Events.calendarSubscribed('copy') }}>
                {copied ? 'Link copied' : 'Copy private link'}
              </Button>
              <Button variant="quiet" size="sm" onClick={resetLink}>Reset link</Button>
            </div>
          )}
        </PanelSection>
      )}

      <div className="border-t border-line pt-5">
        <QuickLinks family={family} />
      </div>
    </div>
  )
}

/** Everyone's week at a glance. Shown once something with a weekly time is on the calendar. */
function ThisWeek({ familyId, events }: { familyId: string; events: Family['events'] }) {
  const [week, setWeek] = useState<FamilyWeek | null>(null)
  const [offset, setOffset] = useState(0)
  const hasWeekly = events.some(e => e.start_time || e.rrule)

  useEffect(() => {
    if (!hasWeekly) return
    const d = new Date()
    d.setDate(d.getDate() + offset * 7)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    getFamilyWeek(familyId, iso).then(setWeek).catch(() => setWeek(null))
  }, [familyId, events, offset, hasWeekly])

  if (!hasWeekly || !week) return null
  return (
    <PanelSection
      title={offset === 0 ? 'This week' : `Week of ${new Date(week.week_of + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
      action={
        <div className="flex items-center gap-1">
          <IconButton icon="chevron-left" label="Previous week" size="sm" onClick={() => setOffset(o => o - 1)} />
          {offset !== 0 && <Button variant="quiet" size="sm" onClick={() => setOffset(0)}>Today</Button>}
          <IconButton icon="chevron-right" label="Next week" size="sm" onClick={() => setOffset(o => o + 1)} />
        </div>
      }
    >
      <WeekView week={week} compact />
    </PanelSection>
  )
}
