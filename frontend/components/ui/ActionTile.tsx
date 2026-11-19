'use client'

import { useId, type MouseEventHandler, type ReactNode } from 'react'
import { cx } from './cx'
import { Icon, type IconName } from './Icon'

/**
 * A large button that names one thing a person can do: an icon, a verb-first title and an
 * optional hint. Use a grid of these where a page would otherwise describe its features.
 *
 * Three forms:
 * - `href`: a link. The whole tile is the target and the arrow points right.
 * - `onClick`: a button, same look.
 * - `children` with `expanded` and `onToggle`: a preview. The tile opens in place to show
 *   `children` (a short explanation and the button that goes on), so nobody lands on a new
 *   page before knowing what it is. The arrow becomes a chevron.
 */
export function ActionTile({ icon, title, hint, href, onClick, disabled = false, expanded, onToggle, children, className }: {
  icon: IconName
  title: string
  hint?: string
  href?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  /** Preview form: whether the preview is showing. */
  expanded?: boolean
  onToggle?: () => void
  /** Preview form: what shows when the tile is open. */
  children?: ReactNode
  className?: string
}) {
  const panelId = useId()
  const preview = children !== undefined
  const row = 'flex w-full items-center gap-4 p-4 text-left'
  const box = 'rounded-lg border bg-surface transition-colors duration-150'
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-highlight text-ink">
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        {hint && <span className="block text-small text-muted">{hint}</span>}
      </span>
      <Icon name={preview ? 'chevron-down' : 'arrow-right'} className={cx('text-muted', preview && expanded && 'rotate-180')} />
    </>
  )

  if (preview) {
    return (
      <div className={cx(box, expanded ? 'border-ink' : 'border-line hover:border-ink', className)}>
        <button type="button" onClick={onToggle} aria-expanded={!!expanded} aria-controls={panelId} className={cx(row, 'press rounded-lg')}>
          {body}
        </button>
        {expanded && <div id={panelId} className="border-t border-line p-4">{children}</div>}
      </div>
    )
  }

  const cls = cx(box, row, 'press border-line hover:border-ink active:border-ink disabled:pointer-events-none disabled:opacity-40', className)
  return href
    ? <a href={href} className={cls}>{body}</a>
    : <button type="button" onClick={onClick} disabled={disabled} className={cls}>{body}</button>
}
