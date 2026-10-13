import type { HTMLAttributes, MouseEventHandler, ReactNode } from 'react'
import { cx } from './cx'

/**
 * Rows separated by hairlines: search results, agent results, settings lists. Rows carry
 * 12px side padding and the list pulls out by the same amount, so row text lines up with
 * the heading above while the hover wash has room.
 */
export function List({ className, children, flush = false, ...rest }: { flush?: boolean } & HTMLAttributes<HTMLUListElement>) {
  return <ul className={cx('divide-y divide-line', !flush && '-mx-3', className)} {...rest}>{children}</ul>
}

const DENSITY = { comfortable: 'py-5', compact: 'py-3' }

/** One row. With `href` the whole row is a link and gets a light hover wash. */
export function ListRow({ href, onClick, external = false, density = 'comfortable', className, children }: {
  href?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  external?: boolean
  density?: keyof typeof DENSITY
  className?: string
  children: ReactNode
}) {
  const pad = cx('px-3', DENSITY[density])
  return (
    <li className={className}>
      {href ? (
        <a
          href={href}
          onClick={onClick}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className={cx('block rounded-md transition-colors duration-150 hover:bg-tint', pad)}
        >
          {children}
        </a>
      ) : (
        <div className={pad}>{children}</div>
      )}
    </li>
  )
}
