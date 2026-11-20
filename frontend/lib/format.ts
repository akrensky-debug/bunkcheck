// Shared display formats, so the same fact reads the same way on every page.

/** Driving-scale distance: "under 1 mi", "2.4 mi", "13 mi". Two decimals is false precision. */
export function miles(d: number | null | undefined): string | null {
  if (d == null) return null
  if (d < 1) return 'under 1 mi'
  if (d < 10) return `${d.toFixed(1)} mi`
  return `${Math.round(d)} mi`
}

// Listing fields as a parent would name them. Keys are the backend's
// TRUST_IMPORTANT_FIELDS (campfinder/services/camps.py) and activity fields.
const FIELD_LABEL: Record<string, string> = {
  price_min: 'price',
  price_per_week: 'weekly price',
  sessions: 'session dates',
  description_short: 'description',
  transportation: 'transportation',
  extended_care: 'extended care',
  meals_included: 'meals',
  financial_aid: 'financial aid',
  refund_policy_summary: 'refund policy',
  special_needs_notes: 'support for special needs',
  medical_support_notes: 'medical support',
  registration_url: 'registration link',
}

/** What the listing says about a yes/no fact. null means the listing doesn't say, which is not a no. */
export const NOT_LISTED = 'Ask the camp'

export function listingFact(value: boolean | null | undefined, yes = 'Yes'): string {
  return value == null ? NOT_LISTED : value ? yes : 'No'
}

/** A field name for people: "refund_policy_summary" becomes "refund policy". */
export function fieldLabel(field: string): string {
  const key = field.replace(/^schedule\./, '')
  return FIELD_LABEL[key] ?? key.replace(/_/g, ' ')
}

/** "a, b and c" */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
