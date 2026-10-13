import type { CampSearchResult } from '@/lib/api'
import TrustBadge from './TrustBadge'
import { Events } from '@/lib/analytics'

interface Props {
  camp: CampSearchResult
  rank?: number
}

export default function CampCard({ camp, rank }: Props) {
  const typeLabel: Record<string, string> = {
    day: 'Day Camp', sleepaway: 'Sleepaway', specialty: 'Specialty'
  }

  return (
    <a
      href={`/camps/${camp.slug || camp.id}`}
      onClick={() => Events.campDetailViewed(camp.id)}
      className="group block bg-white rounded-2xl border border-line p-5 relative card-interactive"
    >

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {rank && <span className="text-xs font-bold font-display text-flashlight bg-navy px-2 py-0.5 rounded-full tabular-nums">#{rank}</span>}
            <span className="text-xs text-muted font-semibold uppercase tracking-wide">{typeLabel[camp.camp_type] ?? camp.camp_type}</span>
          </div>
          <h3 className="font-bold text-navy text-lg leading-tight truncate">{camp.name}</h3>
          <p className="text-sm text-muted mt-0.5">
            {camp.city}, {camp.state}
            {camp.distance_miles != null && ` · ${camp.distance_miles} mi`}
          </p>
        </div>
        {camp.price_per_week && (
          <div className="text-right shrink-0">
            <span className="text-lg font-bold font-display text-navy">${Math.round(camp.price_per_week)}</span>
            <span className="text-xs text-muted">/wk</span>
          </div>
        )}
      </div>

      {camp.description_short && (
        <p className="text-sm text-muted mb-3 line-clamp-2">{camp.description_short}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {camp.primary_categories?.slice(0, 3).map(cat => (
          <span key={cat} className="text-xs border border-line bg-paper text-navy px-2.5 py-0.5 rounded-full capitalize">{cat}</span>
        ))}
        {camp.age_min != null && camp.age_max != null && (
          <span className="text-xs border border-line bg-paper text-navy px-2.5 py-0.5 rounded-full">
            Ages {camp.age_min}-{camp.age_max}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <TrustBadge status={camp.verification_status} aca={camp.aca_accredited} />
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
          {camp.transportation && <span>🚌 Transport</span>}
          {camp.extended_care && <span>⏰ Extended care</span>}
          {camp.financial_aid && <span>💰 Aid available</span>}
        </div>
      </div>

      {camp.match_reasons && camp.match_reasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-line">
          <p className="text-xs text-navy font-semibold flex items-start gap-2">
            <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-flashlight ring-1 ring-navy shrink-0" />
            <span>
            {camp.match_reasons.slice(0, 2).join(' · ')}</span>
          </p>
        </div>
      )}
    </a>
  )
}
