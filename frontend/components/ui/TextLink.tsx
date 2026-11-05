import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

const TONE = {
  ink: 'font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink',
  muted: 'text-muted hover:text-ink',
  plain: 'text-ink hover:underline underline-offset-4',
}

/** An inline text link. `external` opens a new tab and adds the external icon; `arrow` adds a trailing arrow. */
export function TextLink({ tone = 'ink', external = false, arrow = false, className, children, ...rest }: {
  tone?: keyof typeof TONE
  external?: boolean
  arrow?: boolean
  children: ReactNode
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cx('inline-flex items-center gap-1 transition-colors duration-150', TONE[tone], className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
      {external && <Icon name="external" size={14} />}
      {arrow && <Icon name="arrow-right" size={14} />}
    </a>
  )
}
