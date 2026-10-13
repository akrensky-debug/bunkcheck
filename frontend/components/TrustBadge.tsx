function Tick() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="shrink-0">
      <path
        d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="check-path check-retick"
      />
    </svg>
  )
}

export default function TrustBadge({ status, aca }: { status: string; aca?: boolean | null }) {
  const map: Record<string, { label: string; cls: string; checked: boolean }> = {
    team_verified: { label: 'Checked with the camp', cls: 'bg-checked-soft text-checked', checked: true },
    camp_verified: { label: 'Confirmed by the camp', cls: 'bg-checked-soft text-checked', checked: true },
    claimed:       { label: 'Claimed by the camp',   cls: 'bg-brand-50 text-navy',        checked: false },
    unverified:    { label: 'Not yet verified',      cls: 'bg-gray-100 text-muted',       checked: false },
  }
  const badge = map[status] ?? map.unverified
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
        {badge.checked && <Tick />}
        {badge.label}
      </span>
      {aca && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-line bg-white text-navy">
          ACA accredited
        </span>
      )}
    </span>
  )
}
