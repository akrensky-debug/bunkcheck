import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import { Heading } from './Typography'
import { Text } from './Typography'

const WIDTH = { narrow: 'max-w-narrow', default: 'max-w-default', wide: 'max-w-wide' }

/** Page width and side gutters (16px on phones, 24px up). */
export function Container({ size = 'default', className, children, ...rest }: {
  size?: keyof typeof WIDTH
} & HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('mx-auto w-full px-4 sm:px-6', WIDTH[size], className)} {...rest}>{children}</div>
}

// The spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 64.
const GAP = {
  1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6', 8: 'gap-8', 12: 'gap-12', 16: 'gap-16',
} as const

/** Vertical (or horizontal) stack with a gap from the rhythm. */
export function Stack({ gap = 4, row = false, wrap = false, align, className, children, ...rest }: {
  gap?: keyof typeof GAP
  row?: boolean
  wrap?: boolean
  align?: 'start' | 'center' | 'end' | 'baseline'
} & HTMLAttributes<HTMLDivElement>) {
  const alignCls = align && { start: 'items-start', center: 'items-center', end: 'items-end', baseline: 'items-baseline' }[align]
  return (
    <div className={cx('flex', row ? 'flex-row' : 'flex-col', wrap && 'flex-wrap', GAP[gap], alignCls, className)} {...rest}>
      {children}
    </div>
  )
}

/**
 * A page section: optional heading, description and action, then content. `divided` puts a
 * hairline above it; that is how sections are separated (not boxes).
 */
export function Section({ title, description, action, divided = false, level = 'h2', className, children, ...rest }: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  divided?: boolean
  level?: 'h2' | 'h3'
} & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section className={cx(divided && 'border-t border-line pt-8', className)} {...rest}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {title && <Heading level={level}>{title}</Heading>}
          {action}
        </div>
      )}
      {description && <Text tone="muted" variant="small" className="-mt-2 mb-4">{description}</Text>}
      {children}
    </section>
  )
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cx('border-0 border-t border-line', className)} />
}

/** A white container, for the rare case whitespace isn't enough (forms, a sticky bar). */
export function Surface({ padded = true, className, children, ...rest }: { padded?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-lg bg-surface', padded && 'p-5', className)} {...rest}>{children}</div>
}
