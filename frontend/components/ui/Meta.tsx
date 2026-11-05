import { Fragment, type ReactNode } from 'react'
import { cx } from './cx'

/** A muted line of facts joined with " · ". Empty parts (null, false, '') are skipped. */
export function Meta({ parts, className, as: Tag = 'p' }: {
  parts: Array<ReactNode | null | undefined | false>
  className?: string
  as?: 'p' | 'span' | 'div'
}) {
  const shown = parts.filter(p => p !== null && p !== undefined && p !== false && p !== '')
  if (!shown.length) return null
  return (
    <Tag className={cx('text-small text-muted', className)}>
      {shown.map((p, i) => (
        <Fragment key={i}>{i > 0 && <span aria-hidden="true"> · </span>}{p}</Fragment>
      ))}
    </Tag>
  )
}

/** "$385/wk": the amount in bold display type, the unit muted. */
export function Price({ amount, unit, prefix, className }: {
  amount: number
  unit?: string
  prefix?: string
  className?: string
}) {
  return (
    <span className={cx('whitespace-nowrap', className)}>
      {prefix && <span className="text-caption text-muted">{prefix} </span>}
      <span className="font-display text-h3 text-ink">${Math.round(amount).toLocaleString()}</span>
      {unit && <span className="text-small text-muted">{unit}</span>}
    </span>
  )
}
