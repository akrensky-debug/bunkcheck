import type { CampSearchResult } from '@/lib/api'
import { Events } from '@/lib/analytics'
import { ListRow, Meta, Price, TrustMark } from '@/components/ui'

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
  const place = [camp.city && `${camp.city}, ${camp.state}`, camp.distance_miles != null && `${camp.distance_miles} mi`]
    .filter(Boolean).join(' · ')
  const interests = camp.primary_categories?.slice(0, 2).map(cap).join(', ')

  return (
    <ListRow href={`/camps/${camp.slug || camp.id}`} onClick={() => Events.campDetailViewed(camp.id)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-h3 text-ink min-w-0">{camp.name}</h3>
        {camp.price_per_week ? <Price amount={camp.price_per_week} unit="/wk" className="shrink-0" /> : null}
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
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {camp.match_reasons?.length > 0 && (
          <span className="text-small font-semibold text-ink">{camp.match_reasons.slice(0, 2).join(' · ')}</span>
        )}
        <TrustMark status={camp.verification_status} />
      </div>
    </ListRow>
  )
}
