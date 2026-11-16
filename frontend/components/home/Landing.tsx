'use client'

import { useEffect, useState } from 'react'
import { getUpcomingOpenings, type Opening } from '@/lib/alerts'
import { countdown, fmtWhen } from '@/lib/booking'
import { Heading, Icon, List, ListRow, Meta, Section, Text, TextLink, cx } from '@/components/ui'

/** Starters name no town: the assistant asks, or already knows it from the family profile. */
export const STARTERS = [
  'Plan our whole summer',
  'Cover two kids for all of July',
  'A STEM day camp for my 8-year-old',
  'When does registration open near me?',
]

/** Suggested first messages, as full-width rows a thumb can hit. */
export function Starters({ onPick, disabled }: { onPick: (text: string) => void; disabled: boolean }) {
  return (
    <div>
      <Text variant="small" tone="muted" id="starters-label">Or try one</Text>
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

// Written as one parent to another: the jobs we were tired of, and what we built for each.
const LOAD: Array<[string, string]> = [
  ['Twenty open tabs', 'Now every camp reads the same: dates, hours, ages, price.'],
  ['Registration mornings', 'We check the date and email you before it opens.'],
  ['The week nobody covered', 'We flag gaps and overlaps before you pay a deposit.'],
  ['The same form, again', 'Enter your details once. Share them only when you say.'],
  ['Keeping everyone posted', 'One calendar for your partner, the grandparents, the sitter.'],
]

const PROMISES: React.ReactNode[] = [
  'It’s free for parents. No ads.',
  <>Camps can&rsquo;t pay to rank. <TextLink href="/ranking">How we rank</TextLink></>,
  'We tell you what we’ve checked, and what we haven’t.',
  'Your family’s data is yours. We never sell it.',
]

/** Everything under the hero for a parent who is new here. */
export function Landing({ className }: { className?: string }) {
  return (
    <div className={cx('space-y-16', className)}>
      <OpeningSoon />

      <Section title="What we were tired of doing" divided>
        <dl className="divide-y divide-line">
          {LOAD.map(([hers, ours]) => (
            <div key={hers} className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-6">
              <dt className="font-semibold text-ink">{hers}</dt>
              <dd className="text-muted sm:col-span-2">{ours}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Parent to parent" divided>
        <ul className="grid gap-x-12 gap-y-3 sm:grid-cols-2">
          {PROMISES.map((line, i) => <li key={i} className="text-ink">{line}</li>)}
        </ul>
      </Section>

      <div className="space-y-2 border-t border-line pt-8">
        <Text variant="small" tone="muted">
          We cover the Northeast so far, mostly around Providence and Boston.
        </Text>
        <Text variant="small" tone="muted">
          Run a camp? <TextLink href="/operators">Listing is free</TextLink>
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
        We check each date against the camp&rsquo;s own site. Tap one and we&rsquo;ll email you first.
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
