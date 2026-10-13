import TrustBadge from '@/components/TrustBadge'
import { List, ListRow, Meta, Price, cx } from '@/components/ui'
import {
  KIND_LABEL, money,
  type ActivityCard, type ActivityOffering, type ActivityProgram, type FamilyWeek, type ScheduleFitResult,
} from '@/lib/activities'

const SHOWN = 5

const DAY_NAMES: Record<string, string> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' }

function clock(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`
}

/** 'FREQ=WEEKLY;BYDAY=TU,TH' + '16:40' -> 'Tue & Thu 4:40pm'. */
export function weeklyLabel(rrule: string, startTime?: string | null) {
  const codes = (rrule.match(/BYDAY=([A-Z,]+)/)?.[1] ?? '').split(',').filter(Boolean)
  const days = codes.length === 5 && !codes.includes('SA') && !codes.includes('SU')
    ? 'Weekdays'
    : codes.map(c => DAY_NAMES[c] ?? c).join(codes.length === 2 ? ' & ' : ', ')
  return [days || 'Weekly', startTime ? clock(startTime.slice(0, 5)) : ''].filter(Boolean).join(' ')
}

function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function EnrollmentChip({ o }: { o: ActivityOffering }) {
  if (o.availability === 'full') return <span className="text-caption font-semibold text-error">Full</span>
  if (o.availability === 'waitlist') return <span className="text-caption font-semibold text-warn">Waitlist</span>
  if (o.enrollment_status === 'open')
    return <span className="text-caption font-semibold text-checked">Open{o.enrollment_closes ? ` until ${fmtDay(o.enrollment_closes)}` : ''}</span>
  if (o.enrollment_status === 'upcoming' && o.enrollment_opens)
    return <span className="text-caption text-ink">Opens {fmtDay(o.enrollment_opens)}</span>
  if (o.enrollment_status === 'closed') return <span className="text-caption text-muted">Registration closed</span>
  return null
}

function OfferingRow({ o }: { o: ActivityOffering }) {
  const label = [o.skill_level, o.term_name].filter(Boolean).join(' · ')
  const price = o.price != null ? `${money(o.price)}/term` : o.per_class != null ? `${money(o.per_class)}/class` : null
  return (
    <li className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-small font-semibold text-ink">{o.schedule || 'Day and time not published'}</p>
        <Meta
          className="text-caption"
          parts={[label, o.start_date && o.end_date ? `${fmtDay(o.start_date)} – ${fmtDay(o.end_date)}` : null, o.location]}
        />
      </div>
      <div className="shrink-0 space-y-0.5 text-right">
        {price && <p className="text-small font-semibold text-ink">{price}</p>}
        <EnrollmentChip o={o} />
      </div>
    </li>
  )
}

/** One activity as a List row. Must sit inside a <List>. */
export function ActivityResultCard({ a }: { a: ActivityCard; rank?: number }) {
  const price = a.per_class != null ? { v: a.per_class, u: '/class' } : a.term_price != null ? { v: a.term_price, u: '/term' } : null
  return (
    <ListRow>
      <a href={`/activities/${a.id}`} className="group block">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="min-w-0 font-display text-h3 text-ink group-hover:underline underline-offset-4">{a.name}</h3>
          {price && <Price amount={price.v} unit={price.u} prefix="from" className="shrink-0" />}
        </div>
        <Meta
          className="mt-1"
          parts={[
            KIND_LABEL[a.kind] ?? a.kind,
            a.provider_name,
            a.city && a.state ? `${a.city}, ${a.state}` : null,
            a.distance_miles != null && a.distance_miles >= 1 ? `~${Math.round(a.distance_miles)} mi` : null,
            a.age_min != null && a.age_max != null ? `Ages ${a.age_min}–${a.age_max}` : null,
            a.trial_available && 'Trial class',
          ]}
        />
      </a>
      {a.offerings.length > 0 ? (
        <ul className="mt-2 divide-y divide-line">
          {a.offerings.map(o => <OfferingRow key={o.id} o={o} />)}
        </ul>
      ) : (
        <p className="mt-2 text-small text-muted">The provider hasn&rsquo;t published a schedule we could read. Check their site for times.</p>
      )}
      {a.offering_count > a.offerings.length && (
        <p className="text-caption text-muted">{a.offering_count - a.offerings.length} more times</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {a.match_reasons.length > 0 && (
          <span className="text-small font-semibold text-ink">{a.match_reasons.slice(0, 3).join(' · ')}</span>
        )}
        <TrustBadge status={a.verification_status} />
      </div>
    </ListRow>
  )
}

export function ActivityResults({ activities }: { activities: ActivityCard[] }) {
  if (!activities.length) return null
  return (
    <div>
      <List>
        {activities.slice(0, SHOWN).map((a, i) => <ActivityResultCard key={a.id} a={a} rank={i + 1} />)}
      </List>
      {activities.length > SHOWN && (
        <p className="mt-2 text-small text-muted">{activities.length - SHOWN} more. Ask to see them.</p>
      )}
    </div>
  )
}

export function ActivityDetailCard({ activity }: { activity: ActivityProgram }) {
  const sessions = activity.sessions ?? []
  return (
    <List>
      <ListRow href={`/activities/${activity.id}`}>
        <h3 className="font-display text-h3 text-ink">{activity.name}</h3>
        <Meta className="mt-1" parts={[activity.provider.name, `${activity.location.city}, ${activity.location.state}`]} />
        {sessions.length > 0 && (
          <Meta
            className="mt-1"
            parts={sessions.slice(0, 8).map(s => `${s.schedule?.summary || s.name || 'Schedule to be announced'}${s.skill_level ? ` (${s.skill_level})` : ''}`)}
          />
        )}
        <div className="mt-3"><TrustBadge status={activity.verification.status} /></div>
      </ListRow>
    </List>
  )
}

const SEVERITY = {
  clash: { label: 'Clash', cls: 'text-error' },
  all_day: { label: 'Busy all day', cls: 'text-error' },
  logistics: { label: 'Pickup overlap', cls: 'text-warn' },
}

export function ScheduleFitView({ results }: { results: ScheduleFitResult[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {results.map(r => (
        <li key={r.offering_id} className="py-4">
          <div className="flex justify-between gap-4">
            <p className="text-small font-semibold text-ink">{r.name}</p>
            <span className={cx('shrink-0 text-small font-semibold', r.fits === false ? 'text-error' : r.fits ? 'text-checked' : 'text-muted')}>
              {r.fits === false ? 'Conflicts' : r.fits ? (r.conflicts.length ? 'Fits, with a catch' : 'Fits') : 'Can’t check'}
            </span>
          </div>
          <p className="text-caption text-muted">
            {r.schedule}{r.meetings_left != null ? ` · ${r.no_class_dates?.length ? '' : 'up to '}${r.meetings_left} classes left` : ''}
            {r.no_class_dates?.length ? ` · no class ${r.no_class_dates.map(fmtDay).join(', ')}` : ''}
          </p>
          {r.note && <p className="mt-1 text-small text-muted">{r.note}</p>}
          {r.conflicts.length > 0 && (
            <ul className="mt-2 space-y-1">
              {r.conflicts.map((c, i) => (
                <li key={i} className="text-small text-ink">
                  <span className={cx('font-semibold', SEVERITY[c.severity].cls)}>{SEVERITY[c.severity].label}:</span>{' '}
                  {c.detail} ({c.date_count} {c.date_count === 1 ? 'date' : 'dates'}, from {fmtDay(c.dates[0])})
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}

const KID_COLORS = [
  { text: 'text-series-1', border: 'border-series-1', dot: 'bg-series-1' },
  { text: 'text-series-2', border: 'border-series-2', dot: 'bg-series-2' },
  { text: 'text-series-3', border: 'border-series-3', dot: 'bg-series-3' },
  { text: 'text-series-4', border: 'border-series-4', dot: 'bg-series-4' },
  { text: 'text-series-5', border: 'border-series-5', dot: 'bg-series-5' },
]
const NO_KID = { text: 'text-ink', border: 'border-line', dot: 'bg-muted' }

/** A family's week at a glance: one column per day, entries marked by kid. */
export function WeekView({ week, compact = false }: { week: FamilyWeek; compact?: boolean }) {
  const color = (child: string | null) =>
    child && week.kids.includes(child) ? KID_COLORS[week.kids.indexOf(child) % KID_COLORS.length] : NO_KID
  const today = new Date().toISOString().slice(0, 10)
  const empty = week.days.every(d => d.items.length === 0)
  return (
    <div>
      {!compact && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-h3 text-ink">Week of {fmtDay(week.week_of)}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {week.kids.map(k => (
              <span key={k} className="inline-flex items-center gap-1.5 text-small text-ink">
                <span aria-hidden="true" className={cx('h-2 w-2 rounded-pill', color(k).dot)} />{k}
              </span>
            ))}
          </div>
        </div>
      )}
      {empty ? (
        <p className="text-small text-muted">Nothing scheduled this week.</p>
      ) : (
        <div className={compact ? 'space-y-2' : 'grid grid-cols-1 gap-4 sm:grid-cols-7 sm:gap-3'}>
          {week.days.map(d => (compact && d.items.length === 0 ? null : (
            <div key={d.date} className={compact ? 'flex gap-3' : 'min-w-0'}>
              <p className={cx('text-caption font-semibold', compact ? 'w-10 shrink-0 pt-0.5' : 'mb-1.5', d.date === today ? 'text-ink' : 'text-muted')}>
                {d.label}{!compact && <span className="font-normal"> {new Date(d.date + 'T00:00:00').getDate()}</span>}
              </p>
              <div className="min-w-0 flex-1 space-y-1.5">
                {d.items.map((it, i) => (
                  <div key={`${it.event_id}-${i}`} className={cx('border-l-2 pl-2 text-caption', color(it.child_name).border)} title={it.location ?? undefined}>
                    <p className={cx('font-semibold', color(it.child_name).text)}>{it.time_label}</p>
                    <p className="break-words text-ink">{it.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )))}
        </div>
      )}
    </div>
  )
}
