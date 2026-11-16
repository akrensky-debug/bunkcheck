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

// What we built, as things to do. The hint names the chore each one replaces. A tile either
// opens a page or, with `ask`, sends that message to the assistant.
type Action = { icon: IconName; title: string; hint: string; href?: string; ask?: string }
const ACTIONS: Action[] = [
  { icon: 'search', title: 'Compare camps', hint: 'Instead of twenty open tabs', href: '/search' },
  { icon: 'bell', title: 'Get registration emails', hint: 'Instead of setting alarms', ask: 'When does registration open for camps near me?' },
  { icon: 'board', title: 'See every week', hint: 'Before a gap surprises you', href: '/summer' },
  { icon: 'lock', title: 'Save your forms once', hint: 'Instead of typing them again', href: '/kit' },
  { icon: 'users', title: 'Share one calendar', hint: 'Instead of texting everyone', href: '/household' },
  { icon: 'chat', title: 'Use it in Claude', hint: 'Camp cards in your own chat', href: '/connect' },
]

const PROMISES: React.ReactNode[] = [
  'It’s free for parents. No ads.',
  <>Camps can&rsquo;t pay to rank. <a href="/ranking" className="font-semibold underline underline-offset-4">How we rank</a></>,
  'We tell you what we’ve checked, and what we haven’t.',
  'Your family’s data is yours. We never sell it.',
]

/** Everything under the hero for a parent who is new here. */
export function Landing({ onAsk, disabled, className }: { onAsk: (text: string) => void; disabled: boolean; className?: string }) {
  return (
    <div className={cx('space-y-16', className)}>
      <ExampleSummer />

      <OpeningSoon />

      <Section title="What we built instead" divided>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ACTIONS.map(a => (
            <li key={a.title}>
              {a.ask
                ? <ActionTile icon={a.icon} title={a.title} hint={a.hint} onClick={() => onAsk(a.ask!)} disabled={disabled} />
                : <ActionTile icon={a.icon} title={a.title} hint={a.hint} href={a.href} />}
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

// An example family, not real bookings: activity types, not camp names. Ten weeks, late June to
// late August. `span` is weeks; `kind` picks the fill.
type Block = { label: string; span: 1 | 2 | 3; kind?: 'away' | 'open' }
const EXAMPLE: Array<{ kid: string; fill: string; blocks: Block[] }> = [
  { kid: 'Maya, 8', fill: 'bg-series-3', blocks: [
    { label: 'Soccer', span: 2 }, { label: 'STEM', span: 2 }, { label: 'Away', span: 1, kind: 'away' },
    { label: 'Sailing', span: 3 }, { label: 'Art', span: 2 },
  ] },
  { kid: 'Leo, 5', fill: 'bg-series-2', blocks: [
    { label: 'Nature', span: 2 }, { label: 'Swim', span: 2 }, { label: 'Away', span: 1, kind: 'away' },
    { label: 'Open', span: 1, kind: 'open' }, { label: 'Farm', span: 2 }, { label: 'Art', span: 2 },
  ] },
]
const SPAN = { 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3' }
const MONTHS: Array<[string, string]> = [['June', 'col-span-2'], ['July', 'col-span-4'], ['August', 'col-span-4']]

/** The picture of where she's headed: every week of the summer, one row per kid, one gap flagged. */
function ExampleSummer() {
  return (
    <section>
      <Heading level="h2">The whole summer on one page</Heading>
      <figure className="mt-4 rounded-lg border border-line bg-surface p-4 sm:p-6">
        <div className="grid grid-cols-10 gap-1" aria-hidden="true">
          {MONTHS.map(([m, span]) => <p key={m} className={cx('text-caption text-muted', span)}>{m}</p>)}
        </div>
        {EXAMPLE.map(row => (
          <div key={row.kid} className="mt-3">
            <p className="text-small font-semibold text-ink">{row.kid}</p>
            <ul className="mt-1 grid grid-cols-10 gap-1">
              {row.blocks.map((b, i) => (
                <li
                  key={i}
                  className={cx(
                    'flex h-10 items-center overflow-hidden rounded-sm px-2 text-caption font-semibold',
                    SPAN[b.span],
                    b.kind === 'open' ? 'bg-highlight text-ink' : b.kind === 'away' ? 'bg-tint text-muted' : cx(row.fill, 'text-accent-ink'),
                  )}
                >
                  {/* A one-week block is about 30px wide on a phone: too narrow for a word. */}
                  <span className={cx('truncate', b.span === 1 && 'sr-only sm:not-sr-only')}>{b.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <figcaption className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-highlight" />
            A week nobody has covered yet
          </span>
          <span>An example. Yours fills in as we talk.</span>
        </figcaption>
      </figure>
    </section>
  )
}
