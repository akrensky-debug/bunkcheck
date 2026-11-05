import { authHeaders } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export type BriefField =
  | 'kids' | 'home' | 'school' | 'sorted_weeks' | 'care_hours' | 'interests'
  | 'weekly_budget' | 'max_drive_minutes' | 'sleepaway' | 'booked_elsewhere'
export type Source = 'said' | 'looked_up' | 'guessed'
export type Context = 'suggestions' | 'prices'

export interface Question { field: BriefField; prompt: string; help?: string | null; returning: boolean }
export interface Chip { field: BriefField; label: string; source: Source }
export interface LaterItem { field: BriefField; prompt: string; why: 'skipped' | 'not_sure' }
export interface Brief { chips: Chip[]; next_question: Question | null; finish_later: LaterItem[] }

export interface BriefKid { name?: string | null; age?: number | null; interests?: string[]; notes?: string | null }
export interface WorkBlock { parent: string; days: string[]; start: string; end: string }
export interface AwayRange { start_date: string; end_date: string; label: string; child_name?: string | null }
export interface BriefUpdate {
  home_location?: string
  kids?: BriefKid[]
  school?: string
  summer_start?: string
  summer_end?: string
  weekly_budget?: number
  max_drive_minutes?: number
  sleepaway?: boolean
  booked_elsewhere?: boolean
  work_schedule?: WorkBlock[]
  away?: AwayRange[]
}

export type PickState = 'idea' | 'chosen' | 'backup'
export type CellState = 'open' | 'ideas' | 'chosen' | 'registered' | 'waitlisted' | 'covered' | 'away' | 'not_needed'

export interface Pick {
  id: string
  camp_id: string
  session_id: string | null
  name: string
  city: string | null
  price_per_week: number | null
  start_date: string | null
  end_date: string | null
  state: PickState
  note: string | null
}

export interface Option {
  camp_id: string
  name: string
  city: string
  distance_miles: number | null
  extended_care: boolean | null
  price_per_week: number | null
  session_id: string
  start_date: string
  end_date: string
  last_season: boolean
}

export interface Cell {
  week_of: string
  state: CellState
  label: string | null
  hours: 'ok' | 'check' | 'short' | null
  hours_note: string | null
  picks: Pick[]
  options: Option[]
}

export interface KidRow { name: string; age: number | null; planned: number; weeks_needed: number; cost: number; cells: Cell[] }

export interface Board {
  ready: boolean
  summer_start: string | null
  summer_end: string | null
  weeks: Array<{ week_of: string; week_end: string }>
  kids: KidRow[]
  planned: number
  weeks_needed: number
  cost: number
  start_with: string | null
  notes: string[]
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()), ...(init.headers || {}) },
    cache: 'no-store',
  })
  if (!res.ok) {
    let detail = 'Something went wrong. Try again.'
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}

const ctx = (c: Context[]) => (c.length ? '?' + c.map(x => `context=${x}`).join('&') : '')

export const getBrief = (familyId: string, c: Context[] = []) => call<Brief>(`/families/${familyId}/brief${ctx(c)}`)

export const answerBrief = (familyId: string, update: BriefUpdate, c: Context[] = []) =>
  call<Brief>(`/families/${familyId}/brief${ctx(c)}`, { method: 'PATCH', body: JSON.stringify(update) })

export const skipQuestion = (familyId: string, field: BriefField, notSure: boolean, c: Context[] = []) =>
  call<Brief>(`/families/${familyId}/brief/${field}/${notSure ? 'not-sure' : 'skip'}${ctx(c)}`, { method: 'POST' })

export const getBoard = (familyId: string) => call<Board>(`/families/${familyId}/board`)

export const addPick = (familyId: string, body: {
  child_name: string; week_of: string; camp_id: string; session_id?: string | null; state?: PickState
}) => call<Board>(`/families/${familyId}/picks`, { method: 'POST', body: JSON.stringify(body) })

export const updatePick = (familyId: string, pickId: string, body: { state?: PickState; note?: string }) =>
  call<Board>(`/families/${familyId}/picks/${pickId}`, { method: 'PATCH', body: JSON.stringify(body) })

export const removePick = (familyId: string, pickId: string) =>
  call<Board>(`/families/${familyId}/picks/${pickId}`, { method: 'DELETE' })

export function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function money(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`
}
