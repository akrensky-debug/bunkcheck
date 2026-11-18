'use client'

import { useState } from 'react'
import type { Board, Cell, KidRow, Option, Pick } from '@/lib/summer'
import { TONE_WORD, cellTone, fmtDay, money, toneCounts } from '@/lib/summer'
import {
  Button, ChoiceChip, Heading, Meta, StatusCounts, StatusDot, StatusLegend, StatusMark, StatusStrip, Text, TextLink, cx,
  statusEdge,
} from '@/components/ui'
import { miles } from '@/lib/format'

/** Before we know the dates: one line per kid, nothing to fill in yet. */
export function KidLines({ kids, year }: { kids: Array<{ name: string; age: number | null }>; year: number }) {
  if (!kids.length) return null
  return (
    <ul className="divide-y divide-line border-y border-line">
      {kids.map(k => (
        <li key={k.name} className="py-3">
          <Text><span className="font-semibold">{k.name}</span>{k.age != null && `, ${k.age}`}: summer {year}</Text>
        </li>
      ))}
    </ul>
  )
}

export function SummerBoard({ board, busy, onAdd, onChoose, onRemove }: {
  board: Board
  busy: boolean
  onAdd: (kid: string, week: string, o: Option, choose: boolean) => void
  onChoose: (p: Pick) => void
  onRemove: (p: Pick) => void
}) {
  const [kidIndex, setKidIndex] = useState(0)
  const [openCell, setOpenCell] = useState<string | null>(null)
  const kid = board.kids[Math.min(kidIndex, board.kids.length - 1)]
  const props = { busy, openCell, setOpenCell, onAdd, onChoose, onRemove }

  return (
    <section className="space-y-6" aria-label="Your summer board">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <Heading level="h2">{board.planned} of {board.weeks_needed} weeks planned</Heading>
        {board.cost > 0 && <Text tone="muted">{money(board.cost)} so far, at listed prices</Text>}
      </div>
      {board.start_with && (
        <Text tone="muted">Start with the week of {fmtDay(board.start_with)}.</Text>
      )}
      <StatusLegend items={[
        { tone: 'go', label: 'Set: registered, on your calendar or away' },
        { tone: 'caution', label: 'In progress: ideas, picked, waitlisted or hours to check' },
        { tone: 'stop', label: 'Open: nothing yet' },
        { tone: 'neutral', label: 'No care needed' },
      ]} />

      {/* Phones: one kid at a time, weeks down the page. */}
      <div className="space-y-4 lg:hidden">
        {board.kids.length > 1 && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Whose summer">
            {board.kids.map((k, i) => (
              <ChoiceChip key={k.name} type="radio" name="kid" checked={i === kidIndex} onChange={() => setKidIndex(i)}>
                {k.name}: {k.planned} of {k.weeks_needed}
              </ChoiceChip>
            ))}
          </div>
        )}
        <KidStatus kid={kid} anchor={c => c.state === 'not_needed' ? undefined : `#${kidAnchor(kid, c)}`} />
        <ul className="divide-y divide-line border-y border-line">
          {kid.cells.filter(c => c.state !== 'not_needed').map(c => (
            <li key={c.week_of} id={kidAnchor(kid, c)} className="scroll-mt-20 py-4">
              <WeekCell kid={kid} cell={c} showWeek {...props} />
            </li>
          ))}
        </ul>
      </div>

      {/* Wide screens: a row per week, a column per kid, like the spreadsheet. */}
      <div className="hidden space-y-8 lg:block">
        <div className="max-w-narrow space-y-5">
          {board.kids.map(k => (
            <KidStatus key={k.name} kid={k} named={board.kids.length > 1} anchor={c => `#week-${c.week_of}`} />
          ))}
        </div>
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="w-28 py-2 pr-4 text-left text-small font-semibold text-muted">Week of</th>
              {board.kids.map(k => (
                <th key={k.name} scope="col" className="py-2 pr-4 text-left text-small font-semibold text-ink">
                  {k.name} <span className="font-normal text-muted">{k.planned} of {k.weeks_needed}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {board.weeks.map((w, wi) => (
              <tr key={w.week_of} id={`week-${w.week_of}`} className="scroll-mt-20 border-b border-line align-top">
                <th scope="row" className="py-4 pr-4 text-left text-small font-semibold text-ink">{fmtDay(w.week_of)}</th>
                {board.kids.map(k => (
                  <td key={k.name} className="py-4 pr-4">
                    <WeekCell kid={k} cell={k.cells[wi]} {...props} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {board.notes.map(n => <Text key={n} variant="small" tone="muted">{n}</Text>)}
    </section>
  )
}

const STATE_LINE: Partial<Record<Cell['state'], string>> = {
  registered: 'Registered', waitlisted: 'Waitlisted', chosen: 'Picked', covered: 'On your calendar', away: 'Away',
}

const kidAnchor = (kid: KidRow, c: Cell) => `week-${kid.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${c.week_of}`

/** How a week reads to a screen reader on the strip: "Week of Jun 29: open, nothing yet". */
function weekWord(c: Cell) {
  const state = {
    registered: 'registered', covered: 'on your calendar', away: 'away', chosen: 'picked', waitlisted: 'waitlisted',
    ideas: `${c.picks.length} idea${c.picks.length === 1 ? '' : 's'}`, open: 'open, nothing yet', not_needed: 'no care needed',
  }[c.state]
  const hours = c.hours === 'short' ? ', hours short' : c.hours === 'check' ? ', confirm hours' : ''
  return `Week of ${fmtDay(c.week_of)}: ${state}${c.label && c.state !== 'away' ? ` (${c.label})` : ''}${hours}`
}

/** One kid's summer at a glance: counts by tone and a strip with a segment per week. */
function KidStatus({ kid, named, anchor }: { kid: KidRow; named?: boolean; anchor: (c: Cell) => string | undefined }) {
  const n = toneCounts(kid)
  const weeks = (k: number) => `${k} week${k === 1 ? '' : 's'}`
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {named && <Text as="span" className="w-24 font-semibold">{kid.name}</Text>}
        <StatusCounts items={[
          { tone: 'go', count: n.go, label: `${n.go === 1 ? 'week' : 'weeks'} ${TONE_WORD.go}` },
          { tone: 'caution', count: n.caution, label: TONE_WORD.caution },
          { tone: 'stop', count: n.stop, label: TONE_WORD.stop },
        ]} />
        {n.go + n.caution + n.stop === 0 && <Text as="span" variant="small" tone="muted">No care needed yet</Text>}
      </div>
      <StatusStrip
        label={`${kid.name}'s summer, ${weeks(kid.cells.length)}`}
        segments={kid.cells.map(c => ({ key: c.week_of, tone: cellTone(c), label: weekWord(c), href: anchor(c) }))}
      />
    </div>
  )
}

function WeekCell({ kid, cell, showWeek, busy, openCell, setOpenCell, onAdd, onChoose, onRemove }: {
  kid: KidRow
  cell: Cell
  showWeek?: boolean
  busy: boolean
  openCell: string | null
  setOpenCell: (k: string | null) => void
  onAdd: (kid: string, week: string, o: Option, choose: boolean) => void
  onChoose: (p: Pick) => void
  onRemove: (p: Pick) => void
}) {
  const key = `${kid.name}|${cell.week_of}`
  const open = openCell === key
  const tone = cellTone(cell)
  if (cell.state === 'not_needed') return (
    <div className={cx('pl-3', statusEdge(tone))}>
      {showWeek && <Text variant="small" tone="muted">Week of {fmtDay(cell.week_of)}</Text>}
      <Text variant="small" tone="muted" className="inline-flex items-center gap-2"><StatusDot tone={tone} />No camp needed</Text>
    </div>
  )

  const planned = ['registered', 'chosen', 'covered', 'away'].includes(cell.state)
  const ideas = cell.picks.filter(p => p.state !== 'chosen')
  return (
    <div className={cx('space-y-2 pl-3', statusEdge(tone))}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <div className="min-w-0">
          {showWeek && <Text variant="small" tone="muted">Week of {fmtDay(cell.week_of)}</Text>}
          <div className="flex items-start gap-2">
            <StatusDot tone={tone} className="mt-1.5" />
            {planned ? (
              <Text className="font-semibold">
                {cell.label ?? STATE_LINE[cell.state]}
                <span className="font-normal text-muted"> · {STATE_LINE[cell.state]}</span>
              </Text>
            ) : cell.state === 'waitlisted' ? (
              <Text className="font-semibold">
                {cell.label}<span className="font-normal text-muted"> · Waitlisted</span>
              </Text>
            ) : (
              <Text tone={ideas.length ? 'ink' : 'muted'}>{ideas.length ? `${ideas.length} idea${ideas.length === 1 ? '' : 's'}` : 'Nothing yet'}</Text>
            )}
          </div>
        </div>
        {cell.state !== 'away' && cell.state !== 'registered' && (
          <Button variant="link" size="sm" onClick={() => setOpenCell(open ? null : key)} aria-expanded={open}>
            {open ? 'Close' : planned ? 'Change' : 'Plan this week'}
          </Button>
        )}
      </div>
      {cell.hours === 'short' && <p><StatusMark tone="caution" weight="regular">{cell.hours_note ?? 'Doesn’t cover your hours'}</StatusMark></p>}
      {cell.hours === 'check' && <p><StatusMark tone="caution" weight="regular">{cell.hours_note ?? 'Confirm the hours with the camp'}</StatusMark></p>}

      {open && (
        <div className="space-y-4 pt-2">
          {cell.picks.length > 0 && (
            <ul className="space-y-3">
              {cell.picks.map(p => (
                <li key={p.id} className="space-y-1">
                  <Text variant="small" className="font-semibold">
                    <TextLink href={`/camps/${p.camp_id}`}>{p.name}</TextLink>
                    {p.state === 'chosen' && <span className="font-normal text-muted"> · picked</span>}
                  </Text>
                  <Meta parts={[
                    p.city,
                    p.price_per_week != null ? `${money(p.price_per_week)}/wk` : null,
                    p.last_season ? 'price from last summer' : null,
                  ]} />
                  <div className="flex gap-4">
                    {p.state !== 'chosen' && <Button variant="link" size="sm" disabled={busy} onClick={() => onChoose(p)}>Pick this one</Button>}
                    <Button variant="danger" size="sm" disabled={busy} onClick={() => onRemove(p)}>Remove</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {cell.options.length > 0 ? (
            <div className="space-y-2">
              <Text variant="small" tone="muted">
                {cell.options.length} camp{cell.options.length === 1 ? '' : 's'} near you this week
              </Text>
              <ul className="space-y-3">
                {cell.options.filter(o => !cell.picks.some(p => p.camp_id === o.camp_id)).map(o => (
                  <li key={o.camp_id} className="space-y-1">
                    <Text variant="small" className="font-semibold"><TextLink href={`/camps/${o.camp_id}`}>{o.name}</TextLink></Text>
                    <Meta parts={[
                      o.city,
                      miles(o.distance_miles),
                      o.price_per_week != null ? `${money(o.price_per_week)}/wk` : null,
                      o.extended_care ? 'extended care' : null,
                      o.last_season ? 'dates from last summer' : null,
                    ]} />
                    <div className="flex gap-4">
                      <Button variant="link" size="sm" disabled={busy} onClick={() => onAdd(kid.name, cell.week_of, o, false)}>Add idea</Button>
                      <Button variant="link" size="sm" disabled={busy} onClick={() => onAdd(kid.name, cell.week_of, o, true)}>Pick this one</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : !cell.picks.length && (
            <Text variant="small" tone="muted">No camps near you list this week yet.</Text>
          )}
          <TextLink href={`/search?age=${kid.age ?? ''}`} arrow className="text-small">Browse all camps</TextLink>
        </div>
      )}
    </div>
  )
}
