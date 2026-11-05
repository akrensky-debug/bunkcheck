import type { ReactNode } from 'react'
import { cx } from './cx'
import { Heading, Text } from './Typography'

/** Nothing to show yet: one line of title, one of help, an optional action. */
export function EmptyState({ title, description, action, className }: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('py-16 text-center', className)}>
      <Heading level="h3" as="p">{title}</Heading>
      {description && <Text tone="muted" variant="small" className="mx-auto mt-2">{description}</Text>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

/** Loading placeholder. `rows` renders hairline-separated rows like a List. */
export function Skeleton({ rows, className }: { rows?: number; className?: string }) {
  if (rows) {
    return (
      <div aria-busy="true" aria-label="Loading" className={cx('divide-y divide-line', className)}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-2.5 py-5">
            <div className="h-5 w-1/2 animate-pulse rounded-sm bg-tint" />
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-tint" />
          </div>
        ))}
      </div>
    )
  }
  return <div aria-hidden="true" className={cx('animate-pulse rounded-md bg-tint', className ?? 'h-5 w-full')} />
}

const NOTICE = {
  info: 'bg-tint text-ink',
  warn: 'bg-highlight-soft text-ink',
  success: 'bg-checked-soft text-checked',
  error: 'bg-error-soft text-error',
}

/** A short message that needs to stand out from the page: saved, missing, can't do that. */
export function Notice({ tone = 'info', className, children }: {
  tone?: keyof typeof NOTICE
  className?: string
  children: ReactNode
}) {
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={cx('rounded-md px-4 py-3 text-small', NOTICE[tone], className)}>
      {children}
    </div>
  )
}
