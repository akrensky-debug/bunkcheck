import { TrustMark } from '@/components/ui'

/** A listing's trust status, plus "ACA accredited" when known. Thin wrapper over TrustMark. */
export default function TrustBadge({ status, aca }: { status: string; aca?: boolean | null }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <TrustMark status={status} />
      {aca && <span className="text-small text-muted">ACA accredited</span>}
    </span>
  )
}
