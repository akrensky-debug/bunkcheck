import CampCard from '@/components/CampCard'
import TrustBadge from '@/components/TrustBadge'
import { List, ListRow, Meta } from '@/components/ui'
import { BookingBlock } from '@/components/booking/BookingBlocks'
import { AssignProposal, HouseholdCard, InviteProposal, MessageDraft, TasksCard } from '@/components/household/HouseholdBlocks'
import type { Comparison, Coverage, CoverageStatus, FamilyEvent, Plan, UIData } from '@/lib/agent'
import { ActivityDetailCard, ActivityResults, ScheduleFitView, WeekView, weeklyLabel } from '@/components/agent/ActivityBlocks'

const SHOWN_CAMPS = 5

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtRange(start: string, end: string) {
  return start === end ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`
}

/** Minimal formatting for agent text: paragraphs, bullet lists and **bold**. */
export function AgentText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>,
    )
  return (
    <div className="max-w-measure space-y-4 text-body">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every(l => /^\s*([-*•]|\d+\.)\s/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s/, ''))}</li>)}
            </ul>
          )
        }
        return <p key={i} className="whitespace-pre-wrap">{inline(block)}</p>
      })}
    </div>
  )
}

function CampResults({ camps }: { camps: Extract<UIData, { type: 'camps' }>['camps'] }) {
  if (!camps.length) return null
  return (
    <div>
      <List>
        {camps.slice(0, SHOWN_CAMPS).map((c, i) => <CampCard key={c.id} camp={c} rank={i + 1} />)}
      </List>
      {camps.length > SHOWN_CAMPS && (
        <p className="mt-2 text-small text-muted">{camps.length - SHOWN_CAMPS} more. Ask to see them.</p>
      )}
    </div>
  )
}

function CampDetailCard({ camp }: { camp: Extract<UIData, { type: 'camp_detail' }>['camp'] }) {
  return (
    <List>
      <ListRow href={`/camps/${camp.id}`}>
        <h3 className="font-display text-h3 text-ink">{camp.name}</h3>
        <Meta className="mt-1" parts={[`${camp.city}, ${camp.state}`]} />
        {camp.sessions && camp.sessions.length > 0 && (
          <Meta
            className="mt-1"
            parts={camp.sessions.slice(0, 8).map(s => `${fmtRange(s.start_date, s.end_date)}${s.price ? ` ($${Math.round(s.price)})` : ''}`)}
          />
        )}
        <div className="mt-3"><TrustBadge status={camp.verification_status} aca={camp.aca_accredited} /></div>
      </ListRow>
    </List>
  )
}

function ComparisonView({ data }: { data: Comparison }) {
  const rows: Array<[string, (c: Comparison['camps'][number]) => string]> = [
    ['Location', c => `${c.city}, ${c.state}${c.distance_miles != null ? ` · ${c.distance_miles} mi` : ''}`],
    ['Ages', c => (c.age_min != null && c.age_max != null ? `${c.age_min}–${c.age_max}` : '—')],
    ['Per week', c => (c.price_per_week ? `$${Math.round(c.price_per_week)}` : '—')],
    ['Sessions', c => String(c.session_count)],
    ['Extended care', c => (c.extended_care ? 'Yes' : 'No')],
    ['Transport', c => (c.transportation ? 'Yes' : 'No')],
    ['Meals', c => (c.meals_included ? 'Yes' : 'No')],
  ]
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-small">
          <thead>
            <tr className="border-b border-line">
              <th className="py-3 pr-4 text-left font-normal" />
              {data.camps.map(c => (
                <th key={c.camp_id} className="min-w-36 py-3 pr-4 text-left align-bottom font-display text-ink">
                  <a href={`/camps/${c.camp_id}`} className="hover:underline underline-offset-4">{c.name}</a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([label, get]) => (
              <tr key={label}>
                <td className="whitespace-nowrap py-2.5 pr-4 text-muted">{label}</td>
                {data.camps.map(c => <td key={c.camp_id} className="py-2.5 pr-4 text-ink">{get(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.differences.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-small text-ink">
          {data.differences.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      )}
    </div>
  )
}

const WEEK_TONE = { covered: 'text-checked', gap: 'text-warn', overlap: 'text-error' }

function PlanView({ plan }: { plan: Plan }) {
  const label = { covered: 'Covered', gap: 'Gap', overlap: 'Overlap' }
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-h3 text-ink">{plan.weeks_covered} of {plan.weeks_total} weeks covered</h3>
        <span className="text-small text-muted">About ${Math.round(plan.total_estimated_cost).toLocaleString()}</span>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {plan.weeks.map(w => (
          <li key={w.week_of} className="flex items-baseline gap-4 py-2.5 text-small">
            <span className="w-28 shrink-0 text-muted">{fmtRange(w.week_of, w.week_end)}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{w.camps.map(c => c.name).join(' + ')}</span>
            <span className={`shrink-0 font-semibold ${WEEK_TONE[w.status]}`}>{label[w.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CoverageView({ data }: { data: Coverage }) {
  const tone: Record<CoverageStatus, string> = {
    covered: 'text-checked',
    check_hours: 'text-ink',
    partial: 'text-warn',
    open: 'text-error',
    away: 'text-muted',
    not_needed: 'text-muted',
  }
  const label: Record<CoverageStatus, string> = {
    covered: 'Covered', check_hours: 'Confirm hours', partial: 'Partly covered',
    open: 'Open', away: 'Away', not_needed: 'No care needed',
  }
  const hours = Object.entries(data.care_hours)
  return (
    <div className="space-y-8">
      {hours.length > 0 && (
        <p className="text-small text-muted">
          Care needed: {hours.map(([d, h]) => `${d} ${h}`).join(' · ')}
        </p>
      )}
      {data.kids.map(kid => (
        <div key={kid.name}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-h3 text-ink">{kid.name}</h3>
            <span className="text-small text-muted">
              {kid.weeks_covered} covered · {kid.weeks_partial} partly · {kid.weeks_open} open
            </span>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {kid.weeks.filter(w => w.status !== 'not_needed').map(w => (
              <li key={w.week_of} className="py-2.5 text-small">
                <div className="flex items-baseline gap-4">
                  <span className="w-28 shrink-0 text-muted">{fmtRange(w.week_of, w.week_end)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {w.status === 'away' ? w.away.join(', ') : w.covered_by.join(' + ')}
                  </span>
                  <span className={`shrink-0 font-semibold ${tone[w.status]}`}>{label[w.status]}</span>
                </div>
                {w.status !== 'covered' && w.status !== 'away' && (w.check_hours.length > 0 || w.gaps.length > 0 || w.options.length > 0) && (
                  <div className="mt-1 space-y-0.5 pl-32 text-caption text-muted">
                    {w.check_hours.map(c => <div key={c}>{c}</div>)}
                    {w.gaps.slice(0, 3).map(g => (
                      <div key={g.day}>{fmtRange(g.day, g.day)}: {g.uncovered}</div>
                    ))}
                    {w.options.length > 0 && (
                      <div>
                        Options: {w.options.map(o =>
                          `${o.name} (${o.city}${o.extended_care ? ', extended care' : ''}${o.last_season ? ', last season’s dates' : ''})`
                        ).join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {data.notes.map(n => <p key={n} className="text-caption text-muted">{n}</p>)}
    </div>
  )
}

export function CalendarList({ events, compact = false }: { events: FamilyEvent[]; compact?: boolean }) {
  if (!events.length) return <p className="text-small text-muted">Nothing on the calendar yet.</p>
  return (
    <ul className={compact ? 'space-y-1.5' : 'divide-y divide-line border-y border-line'}>
      {events.map(e => (
        <li key={e.id} className={`flex gap-4 text-small ${compact ? '' : 'py-2.5'}`}>
          <span className={`${compact ? 'w-24' : 'w-28'} shrink-0 text-muted`}>
            {e.rrule ? weeklyLabel(e.rrule, e.start_time) : fmtRange(e.start_date, e.end_date)}
          </span>
          <span className="min-w-0 text-ink">{e.title}</span>
        </li>
      ))}
    </ul>
  )
}

export function AgentBlock({ data, familyId }: { data: UIData; familyId?: string }) {
  switch (data.type) {
    case 'camps':       return <CampResults camps={data.camps} />
    case 'camp_detail': return <CampDetailCard camp={data.camp} />
    case 'comparison':  return <ComparisonView data={data} />
    case 'plan':        return <PlanView plan={data} />
    case 'coverage':    return <CoverageView data={data} />
    case 'calendar':    return <CalendarList events={data.events} />
    case 'profile':     return null // reflected in the family panel
    case 'board':
      return (
        <p className="text-small text-muted">
          {data.planned} of {data.weeks_needed} weeks planned. <a href="/summer" className="text-ink underline underline-offset-4">See your Summer Board</a>
        </p>
      )
    case 'registrations':
    case 'register_checklist':
    case 'registration_package': return <BookingBlock data={data} />
    // Year-round activities
    case 'activities':      return <ActivityResults activities={data.activities} />
    case 'activity_detail': return <ActivityDetailCard activity={data.activity} />
    case 'schedule_fit':    return <ScheduleFitView results={data.results} />
    case 'week':            return <WeekView week={data.week} />
    case 'tasks':           return <TasksCard data={data} />
    case 'household':       return <HouseholdCard data={data} />
    case 'assign_proposal': return <AssignProposal data={data} familyId={familyId} />
    case 'invite_proposal': return <InviteProposal data={data} familyId={familyId} />
    case 'message_draft':   return <MessageDraft data={data} />
  }
}
