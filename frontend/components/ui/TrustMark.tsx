import { cx } from './cx'
import { Icon } from './Icon'

/** Trust statuses as the API sends them. Unknown values read as unverified. */
export const TRUST: Record<string, { label: string; verified: boolean }> = {
  team_verified: { label: 'Checked with the camp', verified: true },
  camp_verified: { label: 'Confirmed by the camp', verified: true },
  provider_verified: { label: 'Confirmed by the provider', verified: true },
  claimed: { label: 'Claimed by the camp', verified: false },
  unverified: { label: 'Not yet verified', verified: false },
}

/** A listing's trust status as a small inline mark: green check + green text when verified, muted text otherwise. */
export function TrustMark({ status, className }: { status: string; className?: string }) {
  const t = TRUST[status] ?? TRUST.unverified
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-small', t.verified ? 'text-checked font-semibold' : 'text-muted', className)}>
      {t.verified && <Icon name="check" size={14} />}
      {t.label}
    </span>
  )
}
