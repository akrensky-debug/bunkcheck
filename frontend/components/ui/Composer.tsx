'use client'

import { useEffect, useRef, type FormEvent } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

/**
 * The chat input: a large white field with a round navy send button. Enter sends,
 * Shift+Enter adds a line. `size="hero"` is the big empty-state version.
 */
export function Composer({ value, onChange, onSubmit, placeholder, disabled = false, canSend = true, busy = false, size = 'dock', autoFocus, label = 'Message' }: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder?: string
  /** Disables sending (and the field). */
  disabled?: boolean
  /** Whether the send button is active (e.g. a family has loaded). */
  canSend?: boolean
  busy?: boolean
  size?: 'hero' | 'dock'
  autoFocus?: boolean
  label?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Grow with the text, up to about six lines.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [value])

  const ready = canSend && !busy && !disabled && value.trim().length > 0

  function submit(e: FormEvent) {
    e.preventDefault()
    if (ready) onSubmit()
  }

  const hero = size === 'hero'
  return (
    <form
      onSubmit={submit}
      className={cx(
        'flex w-full items-end gap-2 border border-line bg-surface shadow-soft transition-colors duration-150 focus-within:border-ink',
        hero ? 'rounded-lg p-2 pl-5' : 'rounded-lg p-1.5 pl-4',
      )}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (ready) onSubmit() }
        }}
        rows={1}
        aria-label={label}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        className={cx(
          'flex-1 resize-none self-center bg-transparent text-ink placeholder:text-muted outline-none',
          hero ? 'py-3 text-body sm:text-lead' : 'py-2 text-body',
        )}
      />
      <button
        type="submit"
        disabled={!ready}
        aria-label={busy ? 'Working' : 'Send'}
        className={cx(
          'inline-flex shrink-0 items-center justify-center rounded-pill bg-accent text-accent-ink transition-colors duration-150 hover:bg-accent-hover disabled:opacity-30',
          hero ? 'h-12 w-12' : 'h-10 w-10',
        )}
      >
        <Icon name="arrow-up" size={hero ? 20 : 16} />
      </button>
    </form>
  )
}
