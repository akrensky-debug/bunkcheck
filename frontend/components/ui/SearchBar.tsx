import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

/**
 * The unified pill search bar: labelled fields separated by hairlines, and a round navy
 * search button. Compose with <SearchField>.
 */
export function SearchBar({ onSubmit, children, label = 'Search', busy = false, className }: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  label?: string
  /** Disables the button while a search runs. */
  busy?: boolean
  className?: string
}) {
  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={cx(
        'flex w-full items-center rounded-pill border border-line bg-surface p-1.5 pl-2 shadow-soft',
        'transition-colors duration-150 focus-within:border-ink',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center divide-x divide-line">{children}</div>
      <button
        type="submit"
        aria-label={busy ? 'Searching' : label}
        disabled={busy}
        className="disabled:opacity-40 ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-ink transition-colors duration-150 hover:bg-accent-hover"
      >
        <Icon name="search" size={20} />
      </button>
    </form>
  )
}

/** One field inside a SearchBar. `grow` takes the spare width. */
export function SearchField({ label, grow = false, className, ...rest }: {
  label: string
  grow?: boolean
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cx('flex min-w-0 flex-col px-3 sm:px-4', grow ? 'flex-1' : 'w-20 shrink-0 sm:w-28', className)}>
      <span className="text-caption font-semibold text-ink">{label}</span>
      <input
        className="w-full min-w-0 bg-transparent text-small text-ink placeholder:text-muted outline-none"
        {...rest}
      />
    </label>
  )
}
