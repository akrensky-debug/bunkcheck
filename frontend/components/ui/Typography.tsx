import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

export type HeadingLevel = 'display' | 'h1' | 'h2' | 'h3'

const HEADING: Record<HeadingLevel, string> = {
  display: 'font-display text-display text-ink text-balance',
  h1: 'font-display text-h1 text-ink text-balance',
  h2: 'font-display text-h2 text-ink',
  h3: 'font-display text-h3 text-ink',
}
const ELEMENT: Record<HeadingLevel, 'h1' | 'h2' | 'h3'> = { display: 'h1', h1: 'h1', h2: 'h2', h3: 'h3' }

/** Headings. `level` sets the look; `as` overrides the element when the outline needs it. */
export function Heading({ level = 'h2', as, className, children, ...rest }: {
  level?: HeadingLevel
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p'
  children: ReactNode
} & HTMLAttributes<HTMLHeadingElement>) {
  const Tag = as ?? ELEMENT[level]
  return <Tag className={cx(HEADING[level], className)} {...rest}>{children}</Tag>
}

export type TextVariant = 'lead' | 'body' | 'small' | 'caption'
export type TextTone = 'ink' | 'muted' | 'checked' | 'warn' | 'error'

const VARIANT: Record<TextVariant, string> = {
  lead: 'text-lead',
  body: 'text-body',
  small: 'text-small',
  caption: 'text-caption',
}
const TONE: Record<TextTone, string> = {
  ink: 'text-ink',
  muted: 'text-muted',
  checked: 'text-checked',
  warn: 'text-warn',
  error: 'text-error',
}

/** Running text. Body copy is capped at a readable measure unless `wide` is set. */
export function Text({ variant = 'body', tone = 'ink', as: Tag = 'p', wide = false, className, children, ...rest }: {
  variant?: TextVariant
  tone?: TextTone
  as?: 'p' | 'span' | 'div' | 'li' | 'dd' | 'dt' | 'label'
  wide?: boolean
  children?: ReactNode
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cx(VARIANT[variant], TONE[tone], !wide && 'max-w-measure', className)} {...rest}>
      {children}
    </Tag>
  )
}
