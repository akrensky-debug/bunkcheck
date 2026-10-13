// Questions to camps. An assistant (or the camp page's form) prepares one; nothing reaches the
// camp until the parent presses Send, choosing then whether to share contact details.

import { authHeaders } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export type InquiryStatus = 'pending' | 'confirmed' | 'delivered' | 'expired' | 'cancelled'

export interface InquiryPreview {
  to: string
  subject: string
  text: string
  kit_included: boolean
  contact_included: boolean
}

export interface Contact {
  name?: string | null
  email?: string | null
  phone?: string | null
}

export interface Reply {
  text: string
  at: string
}

export interface InquiryView {
  id: string
  status: InquiryStatus
  status_text: string
  camp: { id: string; name: string | null }
  question: string | null
  kit_included: boolean
  preview?: InquiryPreview
  expires_at?: string
  delivered_at: string | null
  replies: Reply[]
  contact_included?: boolean
  channel?: string
  kit?: { summary: string; fields: string[]; expires_on: string }
  confirm_token?: string
}

export interface CampInquiryView {
  camp: { id: string; name: string }
  inquiry: {
    id: string
    session: { name: string | null; start_date: string; end_date: string } | null
    question: string | null
    contact: Contact | null
    kit_url: string | null
    source: string
    delivered_at: string | null
    replies: Reply[]
  }
  inquiries: Array<{
    id: string; delivered_at: string | null; source: string; question: string | null
    answered: boolean; billable: boolean; bill_reason: string | null
  }>
  billing: { opted_in: boolean; monthly_cap: number | null }
  agent_appearances_30_days: number
}

class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

async function call<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(auth ? await authHeaders() : {}), ...(init.headers || {}) },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = Array.isArray(body.detail) ? body.detail[0]?.msg?.replace(/^Value error, /, '') : body.detail
    throw new ApiError(typeof detail === 'string' ? detail : 'Something went wrong', res.status)
  }
  return body as T
}

const link = (token: string) => `/inquiries/link/${encodeURIComponent(token)}`

/** The camp page's form. Tries to keep it with the family's data; falls back to none if not allowed. */
export async function askCamp(campId: string, question: string, familyId: string | null, sessionId?: string | null) {
  const body = { program_id: campId, question, session_id: sessionId || null }
  if (familyId) {
    try {
      return await call<InquiryView>('/inquiries', { method: 'POST', body: JSON.stringify({ ...body, family_id: familyId }) }, true)
    } catch (e) {
      if (!(e instanceof ApiError) || ![401, 403].includes(e.status)) throw e
    }
  }
  return call<InquiryView>('/inquiries', { method: 'POST', body: JSON.stringify(body) })
}

export const getInquiry = (token: string) => call<InquiryView>(link(token))
export const sendInquiry = (token: string, contact: Contact | null) =>
  call<InquiryView>(`${link(token)}/confirm`, { method: 'POST', body: JSON.stringify({ contact }) })
export const cancelInquiry = (token: string) => call<InquiryView>(`${link(token)}/cancel`, { method: 'POST' })

export const getCampInquiry = (token: string) => call<CampInquiryView>(`/owners/inquiries/${encodeURIComponent(token)}`)
export const replyToInquiry = (token: string, text: string) =>
  call<CampInquiryView>(`/owners/inquiries/${encodeURIComponent(token)}/reply`, { method: 'POST', body: JSON.stringify({ text }) })

export function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
