'use client'

import { useEffect, useState } from 'react'
import { getUpcomingOpenings, type Opening } from '@/lib/alerts'
import { countdown, fmtWhen } from '@/lib/booking'
import { ActionTile, Button, Heading, Icon, List, ListRow, Meta, Section, Text, TextLink, cx, type IconName } from '@/components/ui'

/** Starters name no town: the assistant asks, or already knows it from the family profile. */
export const STARTERS = [
  'Plan our whole summer',
  'Cover two kids for all of July',
  'A STEM day camp for my 8-year-old',
  'When does registration open near me?',
]

/** Suggested first messages, as buttons. */
export function Starters({ onPick, disabled }: { onPick: (text: string) => void; disabled: boolean }) {
  return (
    <ul aria-label="Or start with one of these" className="flex flex-wrap gap-2">
      {STARTERS.map(s => (
        <li key={s}>
          <Button variant="secondary" size="lg" onClick={() => onPick(s)} disabled={disabled}>{s}</Button>
        </li>
      ))}
    </ul>
  )
}

// What we built, as things to do. The hint names the chore each one replaces. A tile opens a
// short preview first; the button inside it either opens a page or, with `ask`, sends that
// message to the assistant.
type Action = { icon: IconName; title: string; hint: string; more: string; cta: string; href?: string; ask?: string }
const ACTIONS: Action[] = [
  {
    icon: 'search', title: 'Compare camps', hint: 'Instead of twenty open tabs',
    more: 'Every camp is laid out the same way: dates, hours, ages, weekly price and extended care. Search by town and age, then ask us to put two or three side by side.',
    cta: 'Browse camps', href: '/search',
  },
  {
    icon: 'bell', title: 'Get registration emails', hint: 'Instead of setting alarms',
    more: 'We check each camp’s opening date against its own site. Leave your email on a camp’s page and we write when the date is announced, the day before, and when it opens. No account.',
    cta: 'Ask when camps near me open', ask: 'When does registration open for camps near me?',
  },
  {
    icon: 'board', title: 'See every week', hint: 'Before a gap surprises you',
    more: 'Your summer as one board: a row for each kid, a column for each week. Gaps and overlaps show up before you pay a deposit.',
    cta: 'Open your summer board', href: '/summer',
  },
  {
    icon: 'lock', title: 'Save your forms once', hint: 'Instead of typing them again',
    more: 'Allergies, pickup people, insurance: enter them once in your info kit. It is encrypted and never shown to the AI. A camp sees it only when you approve.',
    cta: 'Open your info kit', href: '/kit',
  },
  {
    icon: 'users', title: 'Share one calendar', hint: 'Instead of texting everyone',
    more: 'One family calendar your partner, the grandparents and the sitter can see. It also shows up in Google, Apple or Outlook.',
    cta: 'Set up your household', href: '/household',
  },
  {
    icon: 'chat', title: 'Ask from Claude', hint: 'Instead of one more app',
    more: 'Add Bunkcheck to Claude and ask about camps there. You get the same camp cards: dates, weekly prices, extended care and open weeks.',
    cta: 'See how to add it', href: '/connect',
  },
]

const PROMISES: React.ReactNode[] = [
  'It’s free for parents. No ads.',
  <>Camps can&rsquo;t pay to rank. <a href="/ranking" className="font-semibold underline underline-offset-4">How we rank</a></>,
  'We tell you what we’ve checked, and what we haven’t.',
  'Your family’s data is yours. We never sell it.',
]

/** Everything under the hero for a parent who is new here. */
export function Landing({ onAsk, disabled, className }: { onAsk: (text: string) => void; disabled: boolean; className?: string }) {
  // One preview open at a time.
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className={cx('space-y-16', className)}>
      <ExampleSummer />

      <OpeningSoon />

      <Section title="What we built instead" divided>
        <ul className="grid items-start gap-3 sm:grid-cols-2">
          {ACTIONS.map(a => (
            <li key={a.title}>
              <ActionTile
                icon={a.icon}
                title={a.title}
                hint={a.hint}
                expanded={open === a.title}
                onToggle={() => setOpen(o => (o === a.title ? null : a.title))}
              >
                <p className="text-small text-ink">{a.more}</p>
                <div className="mt-4">
                  {a.ask
                    ? <Button size="md" icon="arrow-right" onClick={() => onAsk(a.ask!)} disabled={disabled}>{a.cta}</Button>
                    : <Button size="md" icon="arrow-right" href={a.href}>{a.cta}</Button>}
                </div>
              </ActionTile>
            </li>
          ))}
        </ul>
      </Section>

      <section className="rounded-lg bg-ink p-6 text-accent-ink sm:p-8">
        <h2 className="font-display text-h2">Parent to parent</h2>
        <ul className="mt-4 grid gap-x-12 gap-y-3 sm:grid-cols-2">
          {PROMISES.map((line, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-highlight text-ink">
                <Icon name="check" size={12} />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line pt-8">
        <Heading level="h2">Ten weeks. Start with one sentence.</Heading>
        <div className="mt-4">
          <Button size="lg" icon="arrow-up" href="#start">Tell us about your kids</Button>
        </div>
      </section>

      <div className="space-y-2 border-t border-line pt-8">
        {/* Counted in the live database on 16 November 2026: 457 camps in CT, MA, ME, NH, RI and VT. */}
        <Text variant="small" tone="muted">
          More than 450 camps in six New England states so far, most around Boston and Providence.
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

// An example family, not real bookings: activity types, not camp names, and round example prices.
// Ten weeks from 21 June. Every block is two weeks, so its label fits on a phone.
type Block = { label: string; perWeek?: number; kind?: 'away' | 'open' }
const EXAMPLE: Array<{ kid: string; blocks: Block[] }> = [
  { kid: 'Maya, 8', blocks: [
    { label: 'Soccer', perWeek: 310 }, { label: 'STEM', perWeek: 395 }, { label: 'Away', kind: 'away' },
    { label: 'Sailing', perWeek: 420 }, { label: 'Art', perWeek: 285 },
  ] },
  { kid: 'Leo, 5', blocks: [
    { label: 'Nature', perWeek: 290 }, { label: 'Swim', perWeek: 240 }, { label: 'Away', kind: 'away' },
    { label: 'Open', kind: 'open' }, { label: 'Farm', perWeek: 330 },
  ] },
]
const WEEKS_PER_BLOCK = 2
// The day each week begins, by month.
const AXIS: Array<[string, number[]]> = [['June', [21, 28]], ['July', [5, 12, 19, 26]], ['August', [2, 9, 16, 23]]]
const MONTH_SPAN: Record<number, string> = { 2: 'col-span-2', 4: 'col-span-4' }

const dollars = (n: number) => '$' + n.toLocaleString('en-US')

/** What the row adds up to, in words and numbers, so the chart needs no legend. */
function rowSummary(blocks: Block[]) {
  const camp = blocks.filter(b => b.perWeek != null)
  const open = blocks.filter(b => b.kind === 'open').length * WEEKS_PER_BLOCK
  const cost = camp.reduce((sum, b) => sum + b.perWeek! * WEEKS_PER_BLOCK, 0)
  const weeks = camp.length * WEEKS_PER_BLOCK + ' weeks of camp' + (open ? ', ' + open + ' still open' : '')
  return weeks + ' · ' + dollars(cost) + (open ? ' so far' : '')
}

/**
 * The picture of where she's headed, drawn the way Tufte would: a real time axis, every label
 * on the thing it names, no box and no legend, and one saturated color, spent on the one week
 * that needs her attention. Each row carries its own total.
 */
function ExampleSummer() {
  return (
    <section>
      <Heading level="h2">A whole summer on one page</Heading>
      <Text className="mt-2">Here&rsquo;s an example: two kids, ten weeks, one gap. Prices are per week.</Text>

      <div className="mt-6">
        <div className="grid grid-cols-10 gap-1 border-b border-line pb-1 text-caption text-muted" aria-hidden="true">
          {AXIS.map(([month, days]) => (
            <div key={month} className={MONTH_SPAN[days.length]}>
              <p className="font-semibold text-ink">{month}</p>
              <div className={cx('grid tabular-nums', days.length === 2 ? 'grid-cols-2' : 'grid-cols-4')}>
                {days.map(d => <span key={d}>{d}</span>)}
              </div>
            </div>
          ))}
        </div>

        {EXAMPLE.map(row => (
          <div key={row.kid} className="mt-4">
            <p className="text-small">
              <span className="font-semibold text-ink">{row.kid}</span>{' '}
              <span className="text-muted">{rowSummary(row.blocks)}</span>
            </p>
            <ul className="mt-1 grid grid-cols-5 gap-1">
              {row.blocks.map((b, i) => (
                <li
                  key={i}
                  className={cx(
                    'flex h-12 flex-col justify-center overflow-hidden rounded-sm px-2 text-caption',
                    b.kind === 'open' ? 'bg-highlight text-ink' : b.kind === 'away' ? 'text-muted' : 'bg-tint text-ink',
                  )}
                >
                  <span className="truncate font-semibold">{b.label}</span>
                  {b.perWeek != null && <span className="truncate text-muted tabular-nums">{dollars(b.perWeek)}</span>}
                  {b.kind === 'open' && <span className="truncate">2 weeks</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
