import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import { Icon, type IconName } from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'quiet' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors duration-150 ' +
  'disabled:opacity-40 disabled:pointer-events-none aria-disabled:opacity-40 aria-disabled:pointer-events-none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'rounded-pill bg-accent text-accent-ink hover:bg-accent-hover',
  secondary: 'rounded-pill border border-line bg-surface text-ink hover:border-ink',
  ghost: 'rounded-pill text-ink hover:bg-tint',
  // Text buttons: no box, no padding. `link` for actions you want seen, `quiet` for
  // housekeeping (cancel, not now), `danger` for remove and delete.
  link: 'rounded-sm text-ink underline decoration-line underline-offset-4 hover:decoration-ink',
  quiet: 'rounded-sm text-muted hover:text-ink',
  danger: 'rounded-sm text-error hover:underline underline-offset-4',
}

const TEXT_ONLY: ButtonVariant[] = ['link', 'quiet', 'danger']

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-small',
  md: 'h-10 px-5 text-small',
  lg: 'h-12 px-6 text-body',
}
const TEXT_SIZES: Record<ButtonSize, string> = { sm: 'text-caption', md: 'text-small', lg: 'text-body' }

export function buttonClass({ variant = 'primary', size = 'md', block = false }: {
  variant?: ButtonVariant; size?: ButtonSize; block?: boolean
} = {}) {
  const text = TEXT_ONLY.includes(variant)
  return cx(BASE, VARIANTS[variant], text ? TEXT_SIZES[size] : SIZES[size], block && 'w-full')
}

interface Common {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Full width. */
  block?: boolean
  /** Icon after the label (e.g. arrow-right, external). */
  icon?: IconName
  /** Icon before the label. */
  leadingIcon?: IconName
  children?: ReactNode
}

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }
type AsLink = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; external?: boolean }
export type ButtonProps = AsButton | AsLink

/** The one button. Pass `href` to render a link that looks like a button. */
export function Button(props: ButtonProps) {
  const { variant, size, block, icon, leadingIcon, children, className, ...rest } = props
  const cls = cx(buttonClass({ variant, size, block }), className)
  const inner = (
    <>
      {leadingIcon && <Icon name={leadingIcon} />}
      {children}
      {icon && <Icon name={icon} />}
    </>
  )
  if ('href' in rest && rest.href !== undefined) {
    const { external, ...a } = rest as AsLink
    return (
      <a className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...a}>
        {inner}
      </a>
    )
  }
  const b = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return <button type={b.type ?? 'button'} className={cls} {...b}>{inner}</button>
}

const ICON_SIZES: Record<ButtonSize, string> = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }
const ICON_VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
  ghost: 'text-ink hover:bg-tint',
  secondary: 'border border-line bg-surface text-ink hover:border-ink',
}

/** A round button holding one icon. `label` is required: it is the accessible name. */
export function IconButton({ icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...rest }: {
  icon: IconName
  label: string
  variant?: keyof typeof ICON_VARIANTS
  size?: ButtonSize
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-pill transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none',
        ICON_SIZES[size], ICON_VARIANTS[variant], className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 'lg' ? 20 : 16} />
    </button>
  )
}
