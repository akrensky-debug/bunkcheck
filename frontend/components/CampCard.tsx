import type { CampSearchResult } from '@/lib/api'
import { Events } from '@/lib/analytics'
import { ListRow, Meta, Price, TrustMark } from '@/components/ui'
import { miles } from '@/lib/format'

interface Props {
  camp: CampSearchResult
  /** Position in the results. Kept for callers; no longer shown. */
  rank?: number
}

export const CAMP_TYPE_LABEL: Record<string, string> = {
  day: 'Day camp', sleepaway: 'Sleepaway', specialty: 'Specialty',
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** One camp as a row in a List: name and price, a meta line, description, why it matched, trust. */
export default function CampCard({ camp }: Props) {
  const ages = camp.age_min != null && camp.age_max != null ? `Ages ${camp.age_min}–${camp.age_max}` : null
  const place = [camp.city && `${camp.city}, ${camp.state}`, miles(camp.distance_miles)]
    .filter(Boolean).join(' · ')
  const interests = camp.primary_categories?.slice(0, 2).map(cap).join(', ')
  // The meta line already carries distance and accreditation, so drop the ranking reasons
  // that repeat them (formats from campfinder/services/ranking.py).
  const reasons = (camp.match_reasons ?? []).filter(r => !/^Within \d+ miles$/.test(r) && r !== 'ACA accredited')

  return (
    <ListRow href={`/camps/${camp.slug || camp.id}`} onClick={() => Events.campDetailViewed(camp.id)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-h3 text-ink min-w-0">{camp.name}</h3>
        {camp.price_per_week ? (
          // Last summer's price says so in words under it, instead of a bare year in front.
          <span className="flex shrink-0 flex-col items-end">
            <Price amount={camp.price_per_week} unit="/wk" />
            {camp.last_season && camp.season_year && (
              <span className="text-caption text-muted">{camp.season_year} price</span>
            )}
          </span>
        ) : camp.price_label ? (
          <span className="shrink-0 whitespace-nowrap text-small text-muted">{camp.price_label}</span>
        ) : null}
      </div>
      <Meta
        className="mt-1"
        parts={[
          place,
          CAMP_TYPE_LABEL[camp.camp_type] ?? camp.camp_type,
          ages,
          interests,
          camp.transportation && 'Transport',
          camp.extended_care && 'Extended care',
          camp.financial_aid && 'Financial aid',
          camp.aca_accredited && 'ACA accredited',
        ]}
      />
      {camp.description_short && (
        <p className="mt-2 max-w-measure text-small text-muted line-clamp-2">{camp.description_short}</p>
      )}
      {/* "Not yet verified" is the default for almost every camp, so the search page says it
          once above the list; a card shows its mark only when it has news (claimed, verified). */}
      {(reasons.length > 0 || camp.verification_status !== 'unverified') && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {reasons.length > 0 && (
            <span className="text-small font-semibold text-ink">{reasons.slice(0, 2).join(' · ')}</span>
          )}
          {camp.verification_status !== 'unverified' && <TrustMark status={camp.verification_status} />}
        </div>
      )}
    </ListRow>
  )
}
