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

  return (
    <div className="max-w-6xl mx-auto px-4 flex gap-6">
      {/* Conversation */}
      <section className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-65px)]">
        <div className="flex items-center justify-between py-3 lg:hidden">
          <button onClick={() => setPanelOpen(o => !o)} className="text-sm font-semibold text-navy underline decoration-flashlight decoration-2 underline-offset-4">
            {panelOpen ? 'Hide your family' : 'Your family & calendar'}
          </button>
          {!empty && <button onClick={newConversation} className="text-sm text-muted hover:text-navy">New chat</button>}
        </div>
        {panelOpen && family && <div className="lg:hidden mb-4"><FamilyPanel family={family} onChange={setFamily} /></div>}

        {empty ? (
          <div className="flex-1 flex flex-col justify-center py-6 md:py-10">
            <HeroPanel />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3" data-reveal>Start with one of these</p>
            <div className="grid sm:grid-cols-2 gap-2.5 max-w-3xl">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={!family}
                  data-reveal
                  className="group card-interactive text-left text-sm bg-white border border-line rounded-2xl px-4 py-3 text-navy disabled:opacity-50 flex items-start justify-between gap-3"
                >
                  <span>{s}</span>
                  <span aria-hidden="true" className="text-muted group-hover:text-navy group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              ))}
            </div>
            {familyError && (
              <p className="text-sm text-red-600 mt-6">We couldn't connect right now. Please refresh to try again.</p>
            )}
          </div>
        ) : (
          <div className="flex-1 py-6 space-y-6">
            {messages.map((m, i) => <MessageView key={i} message={m} familyId={family?.id} />)}
            <div ref={bottomRef} />
          </div>
        )}

        <form
          onSubmit={e => { e.preventDefault(); send(input) }}
          className="sticky bottom-0 bg-paper pt-2 pb-4"
        >
          <div className="flex gap-2 items-end bg-white border border-line rounded-2xl p-2 shadow-sm transition-colors focus-within:border-navy">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
              }}
              rows={1}
              placeholder={empty ? 'Ages, town, interests, weeks you need covered…' : 'Reply…'}
              className="flex-1 resize-none outline-none px-2 py-2 text-base max-h-40 bg-transparent placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || !family}
              className="btn-lift bg-navy hover:bg-night text-white font-semibold px-5 py-2 rounded-xl disabled:opacity-40"
            >
              {busy ? '…' : 'Send'}
            </button>
          </div>
        </form>
      </section>

      {/* Family panel (desktop) */}
      <aside className="hidden lg:block w-80 shrink-0 py-6">
        <div className="sticky top-20 space-y-4">
          {!empty && (
            <button onClick={newConversation} className="text-sm text-muted hover:text-navy">+ New chat</button>
          )}
          {family && <FamilyPanel family={family} onChange={setFamily} />}
        </div>
      </aside>
    </div>
  )
}

function MessageView({ message, familyId }: { message: Message; familyId?: string }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-navy text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] whitespace-pre-wrap animate-rise-in">
          {message.parts.map(p => (p.kind === 'text' ? p.text : '')).join('')}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-3 text-navy animate-fade-in">
      {message.parts.map((p, i) =>
        p.kind === 'text' ? <AgentText key={i} text={p.text} /> : <AgentBlock key={i} data={p.data} familyId={familyId} />,
      )}
      {message.status && (
        <p className="text-sm text-muted flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-flashlight ring-2 ring-navy/80 animate-pulse" />
          {message.status}…
        </p>
      )}
      {message.error && <p className="text-sm text-red-600">{message.error}</p>}
    </div>
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
    <div className="space-y-4">
      <div className="bg-white border border-line rounded-2xl p-4" data-reveal>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Your family</p>
        {profile.kids?.length || profile.home_location ? (
          <div className="space-y-1.5 text-sm text-navy">
            {profile.home_location && <p>📍 {profile.home_location}</p>}
            {profile.kids?.map((k, i) => (
              <p key={i}>
                👧 {k.name || 'Child'}{k.age != null ? `, ${k.age}` : ''}
                {k.interests?.length ? <span className="text-muted"> · {k.interests.join(', ')}</span> : null}
              </p>
            ))}
            {profile.summer_start && profile.summer_end && (
              <p>☀️ {profile.summer_start} → {profile.summer_end}</p>
            )}
            {profile.weekly_budget != null && <p>💵 Up to ${profile.weekly_budget}/week</p>}
            {profile.needs?.map((n, i) => <p key={i} className="text-muted">• {n}</p>)}
          </div>
        ) : (
          <p className="text-sm text-muted">I'll remember your kids, town and summer plans as we talk.</p>
        )}
      </div>

      <ThisWeek familyId={family.id} events={events} />

      <div className="bg-white border border-line rounded-2xl p-4" data-reveal>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Family calendar</p>
        <CalendarList events={events} compact />
        {events.length > 0 && feed && webcal && (
          <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
            <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer" onClick={() => Events.calendarSubscribed('google')} className="text-navy underline decoration-line underline-offset-2 hover:decoration-navy">
              Add to Google Calendar
            </a>
            <a href={webcal} onClick={() => Events.calendarSubscribed('webcal')} className="text-navy underline decoration-line underline-offset-2 hover:decoration-navy">Apple / Outlook</a>
            <button
              onClick={() => { navigator.clipboard?.writeText(feed); setCopied(true); Events.calendarSubscribed('copy') }}
              className="text-muted hover:text-navy"
            >
              {copied ? 'Link copied' : 'Copy private link'}
            </button>
            <button onClick={resetLink} className="text-muted hover:text-navy">Reset link</button>
          </div>
        )}
      </div>

      <div className="bg-white border border-line rounded-2xl p-4" data-reveal>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Household & jobs</p>
        <p className="text-sm text-muted mb-2">
          {family.signed_in
            ? 'Hand off pickups, forms and payments to your partner, a grandparent or the nanny. They get a reminder before each one.'
            : 'Keep a job list for drop-offs, forms and payments. Save to an account to share it.'}
        </p>
        <a href="/household" className="text-sm font-semibold text-navy underline decoration-flashlight decoration-2 underline-offset-4 hover:decoration-navy">Who's doing what →</a>
      </div>

      <div className="bg-white border border-line rounded-2xl p-4" data-reveal>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Info kit</p>
        {family.can_open_kit ? (
          <>
            <p className="text-sm text-muted mb-2">
              Allergies, emergency contacts, insurance: fill them in once, share only what each camp asks for.
            </p>
            <a href="/kit" className="text-sm font-semibold text-navy underline decoration-flashlight decoration-2 underline-offset-4 hover:decoration-navy">Open your info kit →</a>
          </>
        ) : family.signed_in ? (
          <p className="text-sm text-muted">The info kit is private to the family's owner. They can share it with you from the Household page.</p>
        ) : (
          <>
            <p className="text-sm text-muted mb-2">
              Save your family to an account to keep it safe and fill in camp forms once.
            </p>
            <a href="/signin" className="text-sm font-semibold text-navy underline decoration-flashlight decoration-2 underline-offset-4 hover:decoration-navy">Save to an account →</a>
          </>
        )}
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
    <div className="bg-white border border-line rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {offset === 0 ? 'This week' : `Week of ${new Date(week.week_of + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
        </p>
        <div className="flex gap-2 text-sm text-muted">
          <button onClick={() => setOffset(o => o - 1)} aria-label="Previous week" className="hover:text-navy">‹</button>
          {offset !== 0 && <button onClick={() => setOffset(0)} className="text-xs hover:text-navy">Today</button>}
          <button onClick={() => setOffset(o => o + 1)} aria-label="Next week" className="hover:text-navy">›</button>
        </div>
      </div>
      <WeekView week={week} compact />
    </div>
  )
}

const SUMMER_WEEKS = 10

/** Home hero: navy panel, yellow B whose check draws itself in, and a summer-at-a-glance strip. */
function HeroPanel() {
  return (
    <div className="on-dark relative overflow-hidden rounded-[22px] bg-navy text-offwhite p-6 md:p-10 mb-6 animate-rise-in">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-tile opacity-70"
      />
      <div className="relative grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-flashlight mb-3">Summer camp, planned with AI</p>
          <h1 className="text-[1.75rem] leading-[1.1] sm:text-4xl lg:text-[2.75rem] font-extrabold text-white mb-4 [text-wrap:balance]">
            <span className="block">Summer, sorted.</span>
          </h1>
          <p className="text-base md:text-lg text-[#C9CFDC] max-w-xl">
            Tell me about your kids and your summer. I'll find the best camps, fit them into your weeks,
            and help you sign up.
          </p>
        </div>
        <HeroMark className="order-first md:order-none w-14 md:w-28 lg:w-36 h-auto" />
      </div>
      <SummerStrip />
    </div>
  )
}

/** The bare yellow B (on navy) with its check cut drawn in on load. */
function HeroMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="7 3 53 58" className={className} role="img" aria-label="Bunkcheck">
      <path d="M8 4 H35 A13.5 13.5 0 0 1 45 27 A15.5 15.5 0 0 1 39 60 H8 Z" fill="#F5D96B" className="origin-center [transform-box:fill-box] animate-pop" />
      <path d="M24 38 H34 A6 6 0 0 1 34 50 H24 A6 6 0 0 1 24 38 Z" fill="#14213D" />
      <path
        d="M18 18 L24 24 L35 12"
        pathLength={1}
        fill="none"
        stroke="#14213D"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="check-path check-draw"
      />
    </svg>
  )
}

/** Ten summer weeks filling in, one after another. Illustrative only. */
function SummerStrip() {
  return (
    <div className="relative mt-7 md:mt-9">
      <div className="flex items-baseline justify-between mb-2 text-xs text-[#C9CFDC]">
        <span className="font-semibold text-offwhite">Summer at a glance</span>
        <span>June · July · August</span>
      </div>
      <ol className="grid grid-cols-10 gap-1 sm:gap-1.5" aria-label={`${SUMMER_WEEKS} summer weeks, each one covered`}>
        {Array.from({ length: SUMMER_WEEKS }, (_, i) => (
          <li key={i} className="relative h-9 sm:h-11 rounded-md bg-tile overflow-hidden">
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-flashlight origin-bottom animate-week-fill"
              style={{ animationDelay: `${700 + i * 90}ms` }}
            />
            <svg viewBox="0 0 16 16" aria-hidden="true" className="absolute inset-0 m-auto h-3.5 w-3.5 sm:h-4 sm:w-4">
              <path
                d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
                pathLength={1}
                fill="none"
                stroke="#14213D"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="check-path"
                style={{ animation: `draw-check 0.35s cubic-bezier(0.65, 0, 0.35, 1) ${950 + i * 90}ms both` }}
              />
            </svg>
            <span className="sr-only">Week {i + 1}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
