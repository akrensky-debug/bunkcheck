const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface CampSearchResult {
  id: string
  slug?: string | null
  name: string
  city: string
  state: string
  camp_type: string
  primary_categories: string[]
  age_min: number | null
  age_max: number | null
  price_per_week: number | null
  price_min: number | null
  price_max: number | null
  /** Lowest weekly price on file; null when the camp hasn't posted one per week. */
  weekly_price?: number | null
  /** The price as a parent reads it: '$350/week', '$900 to $1,200 per session', 'Price not posted'. */
  price_label?: string
  /** null: the listing doesn't say. Not a no. */
  transportation: boolean | null
  extended_care: boolean | null
  meals_included: boolean | null
  financial_aid: boolean | null
  aca_accredited: boolean | null
  verification_status: string
  season_year?: number | null
  /** Price and dates are from last season; the camp hasn't posted the new one yet. */
  last_season?: boolean
  description_short: string | null
  hero_image_url: string | null
  distance_miles: number | null
  match_score: number | null
  match_reasons: string[]
  detail_url: string | null
}

export interface SearchResponse {
  results: CampSearchResult[]
  total: number
  location: string
  radius_miles: number
}

export interface SessionSummary {
  id: string
  name: string | null
  start_date: string
  end_date: string
  price: number | null
  availability: string
  full_season: boolean
  spots_total?: number | null
  spots_available?: number | null   // null: unknown, not full
  spots_updated_at?: string | null
  spots_source?: 'owner' | 'team' | 'import' | null
}

/** "3 spots left · from the camp, Oct 5" — or null when we don't know. */
export function spotsLine(s: SessionSummary): string | null {
  if (s.spots_available == null) return null
  const n = s.spots_available
  const what = n === 0 ? 'No spots left' : `${n} spot${n === 1 ? '' : 's'} left`
  const who = s.spots_source === 'owner' ? 'from the camp' : s.spots_source === 'team' ? 'checked by our team' : null
  const when = s.spots_updated_at
    ? new Date(s.spots_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
  return [what, [who, when].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
}

export interface TrustSummary {
  verification_status: string
  last_updated: string | null
  fields_verified: string[]
  fields_unverified: string[]
  fields_missing: string[]
  accreditation: { status: string; source: string | null }
  confirmed_by_camp_at?: string | null
}

export interface CampDetail extends CampSearchResult {
  operator_name: string | null
  website_url: string | null
  registration_url: string | null
  email: string | null
  phone: string | null
  street_address: string | null
  zip: string
  region: string | null
  description_full: string | null
  activities: string[]
  indoor_outdoor: string | null
  gender_policy: string | null
  refund_policy_summary: string | null
  special_needs_notes: string | null
  swim_waterfront_notes: string | null
  aca_source_url: string | null
  last_updated_date: string | null
  season_note?: string | null
  sessions: SessionSummary[]
  trust_summary: TrustSummary
}

/** The town we know nearest a position, for "Near me". The position is not stored. */
export async function nearestPlace(lat: number, lng: number): Promise<string> {
  // About 1 km is plenty to pick a town, and it's all we send. A POST keeps it out of request logs.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Couldn\u2019t read your location. Type your town instead.')
  const res = await fetch(`${API}/api/v1/places/nearest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  }).catch(() => { throw new Error('Couldn\u2019t look up your town. Type it instead.') })
  if (res.status === 404 || res.status === 429) {
    const body = await res.json().catch(() => ({}))
    throw new Error(typeof body.detail === 'string' ? body.detail : 'We don\u2019t have camps near you yet.')
  }
  if (!res.ok) throw new Error('Couldn\u2019t look up your town. Type it instead.')
  const town = (await res.json()).location
  if (typeof town !== 'string' || !town) throw new Error('Couldn\u2019t look up your town. Type it instead.')
  return town
}

export async function searchCamps(params: {
  location: string
  age?: number
  camp_type?: string
  categories?: string[]
  max_price_per_week?: number
  limit?: number
  sort?: 'best_match' | 'distance'
}): Promise<SearchResponse> {
  const res = await fetch(`${API}/api/v1/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, limit: params.limit ?? 20 }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function getCamp(id: string): Promise<CampDetail> {
  const res = await fetch(`${API}/api/v1/camps/${encodeURIComponent(id)}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Camp not found')
  return res.json()
}

export async function submitCamp(data: {
  name: string
  city: string
  state: string
  camp_type?: string
  contact_email: string
  contact_name?: string
  phone?: string
  website_url?: string
  description_short?: string
  age_min?: number
  age_max?: number
  price_per_week?: number
  primary_categories?: string[]
}): Promise<{ id: string; name: string }> {
  const res = await fetch(`${API}/api/v1/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to submit')
  return res.json()
}
