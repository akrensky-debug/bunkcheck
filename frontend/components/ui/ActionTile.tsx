import type { MouseEventHandler } from 'react'
import { cx } from './cx'
import { Icon, type IconName } from './Icon'

/**
 * A large button that names one thing a person can do: an icon, a verb-first title, an optional
 * hint, and an arrow. Use a grid of these where a page would otherwise describe its features.
 * With `href` it is a link; with `onClick` it is a button. The whole tile is the target.
 */
export function ActionTile({ icon, title, hint, href, onClick, disabled = false, className }: {
  icon: IconName
  title: string
  hint?: string
  href?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  className?: string
}) {
  const cls = cx(
    'flex w-full items-center gap-4 rounded-lg border border-line bg-surface p-4 text-left',
    'transition-colors duration-150 hover:border-ink disabled:pointer-events-none disabled:opacity-40',
    className,
  )
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-highlight text-ink">
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        {hint && <span className="block text-small text-muted">{hint}</span>}
      </span>
      <Icon name="arrow-right" className="text-muted" />
    </>
  )
  return href
    ? <a href={href} className={cls}>{body}</a>
    : <button type="button" onClick={onClick} disabled={disabled} className={cls}>{body}</button>
}
