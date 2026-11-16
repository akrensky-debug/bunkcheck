'use client'

import { useEffect, useState } from 'react'
import { getUpcomingOpenings, type Opening } from '@/lib/alerts'
import { countdown, fmtWhen } from '@/lib/booking'
import { Heading, Icon, List, ListRow, Meta, Section, Text, TextLink, cx } from '@/components/ui'

/** Starters name no town: the assistant asks, or already knows it from the family profile. */
export const STARTERS = [
  'Help me plan our whole summer',
  'I need full-day coverage for two kids for all of July',
  'Find a STEM day camp for my 8-year-old',
  'When does registration open for camps near me?',
]

/** Suggested first messages, as full-width rows a thumb can hit. */
export function Starters({ onPick, disabled }: { onPick: (text: string) => void; disabled: boolean }) {
  return (
    <div>
      <Text variant="small" tone="muted" id="starters-label">Or start with one of these</Text>
      <ul aria-labelledby="starters-label" className="-mx-3 mt-1 divide-y divide-line">
        {STARTERS.map(s => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              disabled={disabled}
              className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-3 text-left text-body text-ink transition-colors duration-150 hover:bg-tint disabled:opacity-50"
            >
              {s}
              <Icon name="arrow-right" size={16} className="shrink-0 text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// What a parent does by hand today, and the part of it Bunkcheck takes.
const LOAD: Array<[string, string]> = [
  ['Twenty open tabs', 'Every camp in one format: dates, hours, ages, weekly price and extended care. Compare them without building a spreadsheet.'],
  ['Registration mornings', 'We check each opening date against the camp’s own site and email you before it opens. No account needed.'],
  ['The week nobody covered', 'Your weeks laid out for each kid, with gaps and overlaps flagged before you pay a deposit.'],
  ['The same form, again', 'Your family’s details saved once and encrypted. A camp sees them only when you approve it.'],
  ['Keeping everyone posted', 'One calendar your partner, the grandparents and the sitter can all see.'],
]

const PROMISES: Array<[string, React.ReactNode]> = [
  ['Free for parents, and no ads', 'Planning, comparing, the calendar and registration emails cost you nothing.'],
  ['No camp can pay to move up', <>The order of results follows your kids, your weeks and your budget. <TextLink href="/ranking">How we rank</TextLink></>],
  ['We say what’s checked', 'Most listings are built from each camp’s own site and haven’t been confirmed by the camp yet. Each one says so.'],
  ['Your family’s data stays yours', 'We never sell it. You can download it or delete it at any time.'],
]

/** Everything under the hero for a parent who is new here. */
export function Landing({ className }: { className?: string }) {
  return (
    <div className={cx('space-y-16', className)}>
      <OpeningSoon />

      <Section title="What it takes off your plate" divided>
        <dl className="divide-y divide-line">
          {LOAD.map(([hers, ours]) => (
            <div key={hers} className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-6">
              <dt className="font-semibold text-ink">{hers}</dt>
              <dd className="text-muted sm:col-span-2">{ours}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="On your side" divided>
        <dl className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
          {PROMISES.map(([title, body]) => (
            <div key={title}>
              <dt className="font-semibold text-ink">{title}</dt>
              <dd className="mt-1 text-small text-muted">{body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="space-y-2 border-t border-line pt-8">
        <Text variant="small" tone="muted">
          Camps in CT, MA, ME, NH, NJ, NY, PA, RI and VT, with the most around Providence and Boston.
        </Text>
        <Text variant="small" tone="muted">
          Run a camp? <TextLink href="/operators">Listing it is free</TextLink>
        </Text>
      </div>
    </div>
  )
}

/** Registration dates a person has checked, soonest first. Hidden when there are none. */
function OpeningSoon() {
  const [openings, setOpenings] = useState<Opening[]>([])

  useEffect(() => {
    getUpcomingOpenings().then(setOpenings).catch(() => setOpenings([]))
  }, [])

  if (!openings.length) return null
  return (
    <section className="border-t border-line pt-8">
      <Heading level="h2">Registration opening soon</Heading>
      <Text tone="muted" variant="small" className="mt-2">
        Checked against each camp&rsquo;s own site. Open a camp to get an email before its date.
      </Text>
      <List className="mt-4">
        {openings.map(o => (
          <ListRow key={o.camp_id} href={`/camps/${o.slug || o.camp_id}`}>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div>
                <p className="font-semibold text-ink">{o.name}</p>
                <Meta parts={[[o.city, o.state].filter(Boolean).join(', '), countdown(o.opens_at)]} />
              </div>
              <span className="rounded-pill bg-highlight px-3 py-1 text-small font-semibold text-ink">
                {fmtWhen(o.opens_at)}
              </span>
            </div>
          </ListRow>
        ))}
      </List>
    </section>
  )
}
