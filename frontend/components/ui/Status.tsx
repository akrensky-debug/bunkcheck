import type { ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

/**
 * The stoplight. go: done, confirmed, has a place. caution: in progress or at risk.
 * stop: a gap or a blocker. neutral: not needed, cancelled, unknown.
 * Color is never the only signal: every tone has its own shape, and a mark carries a word.
 */
export type StatusTone = 'go' | 'caution' | 'stop' | 'neutral'
export const STATUS_TONES: StatusTone[] = ['go', 'caution', 'stop', 'neutral']

const TEXT: Record<StatusTone, string> = {
  go: 'text-go',
  caution: 'text-caution',
  stop: 'text-stop',
  neutral: 'text-muted',
}

const SHAPE = {
  go: 'status-go',
  caution: 'status-caution',
  stop: 'status-stop',
  neutral: 'status-neutral',
} as const

/** What each shape means, for legends. */
export const SHAPE_NAME: Record<StatusTone, string> = {
  go: 'filled circle with a check',
  caution: 'half-filled circle',
  stop: 'open ring',
  neutral: 'dash',
}

/**
 * A small shaped mark for dense places (calendar cells, strips). Decorative next to a word;
 * give it a `label` when it stands alone, and it reads as an image with that name.
 */
export function StatusDot({ tone, size = 'sm', label, className }: {
  tone: StatusTone
  /** sm 12px (cells, strips), md 14px (beside small text), lg 20px (beside a heading). */
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}) {
  return (
    <Icon
      name={SHAPE[tone]}
      size={size === 'sm' ? 12 : size === 'md' ? 14 : 20}
      label={label}
      className={cx(TEXT[tone], className)}
    />
  )
}

/** A status with its shape and its word: "Registered", "Waitlist", "Full". */
export function StatusMark({ tone, size = 'sm', weight = 'semibold', className, children }: {
  tone: StatusTone
  size?: 'sm' | 'md'
  /** `regular` for a sentence after the mark; the default is a short label. */
  weight?: 'semibold' | 'regular'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex items-start gap-1.5',
        size === 'sm' ? 'text-caption' : 'text-small',
        weight === 'semibold' && 'font-semibold',
        TEXT[tone],
        className,
      )}
    >
      {/* Centred on the first line, so a mark that wraps keeps its shape by the first word. */}
      <StatusDot tone={tone} size={size} className="mt-1" />
      <span>{children}</span>
    </span>
  )
}

const EDGE: Record<StatusTone, string> = {
  go: 'border-l-2 border-go',
  caution: 'border-l-2 border-caution',
  stop: 'border-l-2 border-stop',
  neutral: 'border-l-2 border-line',
}

/** A quiet left edge in the tone's color, for a row or cell that carries a status. Add your own padding. */
export function statusEdge(tone: StatusTone) {
  return EDGE[tone]
}

const SEGMENT: Record<StatusTone, string> = {
  go: 'bg-go-soft',
  caution: 'bg-caution-soft',
  stop: 'bg-stop-soft',
  neutral: 'bg-tint',
}

/**
 * A thin strip, one segment per item (a week of summer), each tinted and shaped by tone.
 * Each segment is a link (when `href` is set) or a focusable item with its own accessible name.
 */
export function StatusStrip({ label, segments, className }: {
  label: string
  segments: Array<{ key: string; tone: StatusTone; label: string; href?: string }>
  className?: string
}) {
  return (
    <ol aria-label={label} className={cx('flex gap-0.5', className)}>
      {segments.map(s => {
        const inner = (
          <span className={cx('flex h-6 items-center justify-center rounded-sm', SEGMENT[s.tone])}>
            <StatusDot tone={s.tone} />
          </span>
        )
        return (
          <li key={s.key} className="min-w-0 flex-1">
            {s.href ? (
              <a href={s.href} aria-label={s.label} title={s.label} className="block rounded-sm">{inner}</a>
            ) : (
              <span role="img" aria-label={s.label} title={s.label} tabIndex={0} className="block rounded-sm">{inner}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** "6 set · 2 in progress · 2 open": counts by tone, each with its mark. Zero counts are skipped. */
export function StatusCounts({ items, size = 'md', className }: {
  items: Array<{ tone: StatusTone; count: number; label: string }>
  size?: 'sm' | 'md'
  className?: string
}) {
  const shown = items.filter(i => i.count > 0)
  return (
    <p className={cx('flex flex-wrap items-baseline gap-x-4 gap-y-1', className)}>
      {shown.map(i => (
        <StatusMark key={i.tone + i.label} tone={i.tone} size={size}>{i.count} {i.label}</StatusMark>
      ))}
    </p>
  )
}

/** A compact key: each shape and what it means here. */
export function StatusLegend({ items, className }: {
  items: Array<{ tone: StatusTone; label: ReactNode }>
  className?: string
}) {
  return (
    <dl className={cx('flex flex-wrap gap-x-5 gap-y-1 text-caption text-muted', className)}>
      {items.map(i => (
        <div key={i.tone} className="inline-flex items-baseline gap-1.5">
          <dt className="self-center">
            <StatusDot tone={i.tone} label={`${SHAPE_NAME[i.tone]}:`} />
          </dt>
          <dd>{i.label}</dd>
        </div>
      ))}
    </dl>
  )
}
