'use client'

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cx } from './cx'

type FieldSize = 'sm' | 'md'

const CONTROL =
  'w-full rounded-md border border-line bg-surface text-ink placeholder:text-muted outline-none ' +
  'transition-colors duration-150 focus:border-ink disabled:opacity-50'
const SIZE: Record<FieldSize, string> = { sm: 'h-9 px-3 text-small', md: 'h-11 px-3.5 text-body' }

export function controlClass(size: FieldSize = 'md') {
  return cx(CONTROL, SIZE[size])
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { fieldSize?: FieldSize }>(
  function Input({ fieldSize = 'md', className, ...rest }, ref) {
    return <input ref={ref} className={cx(controlClass(fieldSize), className)} {...rest} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx(CONTROL, 'px-3.5 py-2.5 text-body resize-y', className)} {...rest} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { fieldSize?: FieldSize }>(
  function Select({ fieldSize = 'md', className, children, ...rest }, ref) {
    return <select ref={ref} className={cx(controlClass(fieldSize), 'pr-8', className)} {...rest}>{children}</select>
  },
)

/**
 * Label, control, hint and error, stacked. Pass a render function to get the generated id,
 * or a control that sets its own id and pass `htmlFor`.
 */
export function Field({ label, hint, error, optional, className, children, htmlFor }: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  optional?: boolean
  className?: string
  htmlFor?: string
  children: ReactNode | ((id: string) => ReactNode)
}) {
  const auto = useId()
  const id = htmlFor ?? auto
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-small font-semibold text-ink">
        {label}{optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {typeof children === 'function' ? children(id) : children}
      {hint && !error && <p className="text-caption text-muted">{hint}</p>}
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  )
}

/** A checkbox with its label. */
export function Checkbox({ children, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { children?: ReactNode }) {
  return (
    <label className={cx('inline-flex items-start gap-2.5 text-small text-ink cursor-pointer', className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-ink" {...rest} />
      {children && <span>{children}</span>}
    </label>
  )
}

/**
 * A toggle chip for picking several options from a short list (fields to share, reminder
 * days, categories). Use `type="radio"` with a shared `name` for single choice.
 */
export function ChoiceChip({ checked, onChange, children, type = 'checkbox', name, strikeWhenOff = false }: {
  checked: boolean
  onChange: () => void
  children: ReactNode
  type?: 'checkbox' | 'radio'
  name?: string
  /** Show unchecked options struck through (used where unticking removes something). */
  strikeWhenOff?: boolean
}) {
  return (
    <label
      className={cx(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-small transition-colors duration-150',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus',
        checked ? 'border-ink bg-surface text-ink' : cx('border-line text-muted hover:text-ink', strikeWhenOff && 'line-through'),
      )}
    >
      <input type={type} name={name} className="sr-only" checked={checked} onChange={onChange} />
      {checked && type === 'checkbox' && (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      )}
      {children}
    </label>
  )
}
