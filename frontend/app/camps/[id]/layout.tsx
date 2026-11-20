import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type CampFacts = {
  id: string
  slug: string | null
  name: string
  city: string | null
  state: string | null
  description_short: string | null
}

type Loaded = { state: 'found'; camp: CampFacts } | { state: 'missing' } | { state: 'unknown' }

// The page itself loads the camp in the browser. This runs on the server so the tab, a search
// result and a shared link name the camp, and so a camp that doesn't exist answers 404.
// If the API is slow or down, say nothing and let the page handle it: never 404 on a guess.
// Next makes one request for the two calls below, and keeps the answer for an hour.
async function loadCamp(ref: string): Promise<Loaded> {
  try {
    const res = await fetch(`${API}/api/v1/camps/${encodeURIComponent(ref)}`, { next: { revalidate: 3600 } })
    if (res.status === 404) return { state: 'missing' }
    if (!res.ok) return { state: 'unknown' }
    return { state: 'found', camp: await res.json() }
  } catch {
    return { state: 'unknown' }
  }
}

function clip(text: string, max = 160): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const loaded = await loadCamp(params.id)
  if (loaded.state === 'missing') return { title: 'Camp not found | Bunkcheck', robots: { index: false } }
  if (loaded.state !== 'found') return {}

  const { camp } = loaded
  const place = [camp.city, camp.state].filter(Boolean).join(', ')
  const title = `${camp.name}${place ? ` in ${place}` : ''} | Bunkcheck`
  const description = clip(
    camp.description_short
      || `Dates, prices and logistics for ${camp.name}${place ? ` in ${place}` : ''}, and what Bunkcheck has checked.`,
  )
  const path = `/camps/${camp.slug || camp.id}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: 'Bunkcheck', type: 'website' },
  }
}

export default async function CampLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  if ((await loadCamp(params.id)).state === 'missing') notFound()
  return children
}
