// The hand-raiser list: "tell me when Bunkcheck opens in my state". No account, and no email is sent.

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function raiseHand(email: string, state: string, town: string, kidsAges: number[]): Promise<void> {
  const res = await fetch(`${API}/api/v1/hand-raisers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, state: state || null, town: town.trim() || null, kids_ages: kidsAges }),
  })
  if (res.ok) return
  const body = await res.json().catch(() => ({}))
  // A validation error from the API comes back as a list; ours come back as a sentence.
  const detail = Array.isArray(body.detail) ? "Something in the form didn't go through. Check it and try again." : body.detail
  throw new Error(typeof detail === 'string' ? detail : 'We couldn’t save that. Please try again.')
}
