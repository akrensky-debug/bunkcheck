'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
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

/**
 * Example answers to "So, who do you need to plan for?", shown one at a time in the chat bar.
 * Different family shapes, in the words parents use, at schools we have dates for, so copying
 * one works. Each follows the helper above the box (name, age, grade, school), then one need.
 * Each fits two lines on a 360px phone; a third line is cut off, so check before adding.
 */
export const EXAMPLES = [
  'Maya, 8, in 3rd grade, and Leo, 5, in kindergarten. Both at Wheeler.',
  'Sam, 10, in 5th grade at Gordon. Loves coding. No swim camps.',
  'Ella and Max, 7, in 2nd grade in Providence. We work till 6.',
  'Ava, 12, in 7th grade at Lincoln. Open to two weeks of sleepaway.',
  'Noah, 6, in 1st grade in Barrington. Away one week in July.',
  'Three kids, 5, 9 and 13, in Cranston schools. Full days.',
]

const EXAMPLE_MS = 4000

/**
 * The example to show now. It changes every few seconds, and holds still while `paused` (the
 * parent is in the box) and for anyone who asked for reduced motion.
 */
export function useRotatingExample(paused: boolean): string {
  const [i, setI] = useState(0)
  const [still, setStill] = useState(true)  // still until we know reduced motion is off
  useEffect(() => {
    setStill(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  }, [])
  useEffect(() => {
    if (paused || still) return
    const t = window.setInterval(() => setI(n => (n + 1) % EXAMPLES.length), EXAMPLE_MS)
    return () => window.clearInterval(t)
  }, [paused, still])
  return EXAMPLES[i]
}

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
    more: 'Every camp laid out the same way: dates, hours, ages, weekly price and extended care. Search by town and age, then ask us to line up two or three side by side.',
    cta: 'Browse camps', href: '/search',
  },
  {
    icon: 'bell', title: 'Get registration emails', hint: 'So you can stop setting alarms',
    more: 'We check each opening date on the camp’s own site. Leave your email on a camp’s page and we’ll write when the date is announced, the day before, and the minute it opens. No account needed.',
    cta: 'Ask when camps near me open', ask: 'When does registration open for camps near me?',
  },
  {
    icon: 'board', title: 'See every week', hint: 'So no week sneaks up on you',
    more: 'Your whole summer on one board: a row for each kid, a column for each week. You’ll spot gaps and overlaps before you pay a deposit.',
    cta: 'Open your summer board', href: '/summer',
  },
  {
    icon: 'lock', title: 'Save your forms once', hint: 'Not once per camp',
    more: 'Allergies, pickup people, insurance: put them in your info kit once. It’s encrypted and never shown to the AI, and a camp only sees it when you say so.',
    cta: 'Open your info kit', href: '/kit',
  },
  {
    icon: 'users', title: 'Share one calendar', hint: 'So nobody has to text you',
    more: 'One family calendar your partner, the grandparents and the sitter can all see. It shows up in Google, Apple or Outlook too.',
    cta: 'Set up your household', href: '/household',
  },
  {
    icon: 'chat', title: 'Ask from Claude', hint: 'If you already use Claude',
    more: 'Add Bunkcheck to Claude and ask about camps right there. You’ll get the same camp cards: dates, weekly prices, extended care and open weeks.',
    cta: 'See how to add it', href: '/connect',
  },
]

const PROMISES: React.ReactNode[] = [
  'It’s free for parents. No ads.',
  <>Camps can&rsquo;t pay to rank. <a href="/ranking" className="font-semibold underline underline-offset-4">How we rank</a></>,
  'We tell you what we’ve checked, and what we haven’t.',
  'Your family’s data is yours. We never sell it.',
]

/**
 * Everything under the hero for a parent who is new here. The example summer opens it on phones
 * and tablets; on wide screens it already sits beside the headline (HeroSummer), so it is hidden here.
 */
export function Landing({ onAsk, disabled, className }: { onAsk: (text: string) => void; disabled: boolean; className?: string }) {
  // One preview open at a time.
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className={cx('space-y-16', className)}>
      <div className="lg:hidden"><ExampleSummer /></div>

      <OpeningSoon />

      <Section title="What we wish we’d had last summer" divided>
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

      <Promises />

      <section className="border-t border-line pt-8">
        <Heading level="h2">Ten weeks to fill. Let&rsquo;s start with one sentence.</Heading>
        <div className="mt-4">
          <Button size="lg" icon="arrow-up" href="#start">Tell us about your summer</Button>
        </div>
      </section>

      <div className="space-y-2 border-t border-line pt-8">
        <Text variant="small" tone="muted">
          Run a camp? <TextLink href="/operators">Listing is free</TextLink>
        </Text>
      </div>
    </div>
  )
}

/** What we promise a parent, on the navy panel. */
export function Promises() {
  return (
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
        We check every date on the camp&rsquo;s own site. Pick one and we&rsquo;ll give you a heads-up before it opens.
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

/**
 * The weeks fill in once, left to right, the first time the board scrolls into view: time moves
 * the way the eye reads, and the open weeks land last so the gap is what she notices. Nothing is
 * hidden until the script has run, and nothing moves for people who ask for reduced motion.
 */
function useFillIn() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.dataset.armed = ''
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      el.dataset.play = ''
      io.disconnect()
    }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

/** Column by column across both kids, with the open weeks held back to land last. */
function fillOrder(col: number, row: number, b: Block): CSSProperties {
  const step = col * EXAMPLE.length + row + (b.kind === 'open' ? 4 : 0)
  return { '--step': step } as CSSProperties
}

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
export function ExampleSummer({ title = 'A whole summer on one page' }: { title?: string }) {
  return (
    <section>
      <Heading level="h2">{title}</Heading>
      <Text className="mt-2">Here&rsquo;s what that looks like for two kids: ten weeks, one gap still to fill. Prices are per week.</Text>
      <SummerBoard className="mt-6" />
    </section>
  )
}

/**
 * The example summer beside the headline, on wide screens only: the product before any more
 * words. Below lg it is hidden and Landing (or the waitlist page) shows ExampleSummer instead.
 */
export function HeroSummer({ className }: { className?: string }) {
  return (
    <figure className={cx('hidden lg:block', className)}>
      <SummerBoard />
      <figcaption className="mt-3 text-small text-muted">
        An example: two kids, ten weeks, one gap still to fill. Prices are per week.
      </figcaption>
    </figure>
  )
}

function SummerBoard({ className }: { className?: string }) {
  const board = useFillIn()
  return (
      <div ref={board} className={cx('summer-board rounded-lg border border-line bg-surface p-4 shadow-soft sm:p-6', className)}>
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

        {EXAMPLE.map((row, r) => (
          <div key={row.kid} className="mt-4">
            <p className="text-small">
              <span className="font-semibold text-ink">{row.kid}</span>{' '}
              <span className="text-muted">{rowSummary(row.blocks)}</span>
            </p>
            <ul className="mt-1 grid grid-cols-5 gap-1">
              {row.blocks.map((b, i) => (
                <li
                  key={i}
                  style={fillOrder(i, r, b)}
                  className={cx(
                    'summer-block flex h-12 flex-col sm:h-14 justify-center overflow-hidden rounded-sm px-2 text-caption',
                    b.kind === 'open' ? 'bg-highlight text-ink' : b.kind === 'away' ? 'text-muted' : 'bg-tint text-ink',
                  )}
                >
                  <span className="truncate font-semibold">{b.label}</span>
                  {b.perWeek != null && <span className="truncate text-muted tabular-nums">{dollars(b.perWeek)}</span>}
                  {/* Phones have no room for it, and the axis already shows the two weeks. */}
                  {b.kind === 'open' && <span className="hidden truncate sm:block">2 weeks</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
  )
}
