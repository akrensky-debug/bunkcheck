import type { SVGProps } from 'react'

/** Line icons on a 16px grid, 1.5px stroke (Button thickens it to match its label), currentColor. Decorative unless `label` is set. */
const PATHS = {
  'arrow-right': <path d="M3 8h10M9 4l4 4-4 4" />,
  'arrow-left': <path d="M13 8H3M7 4 3 8l4 4" />,
  'arrow-up': <path d="M8 13V3M4 7l4-4 4 4" />,
  check: <path d="M3.5 8.5l3 3 6-7" />,
  search: <><circle cx="7" cy="7" r="4.25" /><path d="M10.25 10.25 13.5 13.5" /></>,
  x: <path d="M4 4l8 8M12 4l-8 8" />,
  'chevron-down': <path d="M4 6l4 4 4-4" />,
  'chevron-left': <path d="M10 4 6 8l4 4" />,
  'chevron-right': <path d="M6 4l4 4-4 4" />,
  calendar: <><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.75h11M5.5 2v3M10.5 2v3" /></>,
  user: <><circle cx="8" cy="5.5" r="2.5" /><path d="M3 13.5c.8-2.3 2.7-3.5 5-3.5s4.2 1.2 5 3.5" /></>,
  plus: <path d="M8 3v10M3 8h10" />,
  external: <path d="M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v4h-9v-9h4" />,
  clock: <><circle cx="8" cy="8" r="5.75" /><path d="M8 5v3.25l2 1.25" /></>,
  // Status shapes (StatusDot, StatusMark). Each tone has its own silhouette, so status reads
  // without color: a filled disc with a check, a half-filled disc, an open ring, a dash.
  'status-go': <><circle cx="8" cy="8" r="6.25" fill="currentColor" /><path d="M5.25 8.25l1.9 1.9 3.6-4.15" className="stroke-surface" strokeWidth={1.75} /></>,
  'status-caution': <><circle cx="8" cy="8" r="5.75" /><path d="M8 2.25a5.75 5.75 0 0 1 0 11.5z" fill="currentColor" /></>,
  'status-stop': <circle cx="8" cy="8" r="5.5" strokeWidth={2.5} />,
  'status-neutral': <path d="M5 8h6" strokeWidth={2.5} />,
  bell: <path d="M4 11V7.5a4 4 0 0 1 8 0V11l1 1.5H3L4 11ZM6.75 14h2.5" />,
  lock: <><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7" /></>,
  users: <><circle cx="6" cy="5.5" r="2.25" /><path d="M1.75 13c.6-2 2.2-3 4.25-3s3.65 1 4.25 3M10.5 3.5a2.25 2.25 0 0 1 0 4.25M12 10.2c1.2.4 2 1.4 2.4 2.8" /></>,
  board: <><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="M2.5 6.5h11M2.5 10h11M6.5 6.5v7" /></>,
  chat: <path d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7l-3 2.75V10.5a2 2 0 0 1-1.5-2v-4Z" />,
} as const

export type IconName = keyof typeof PATHS
export const ICON_NAMES = Object.keys(PATHS) as IconName[]

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: 12 | 14 | 16 | 20 | 24
  label?: string
}

export function Icon({ name, size = 16, label, className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={['shrink-0', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
