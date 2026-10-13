'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { searchCamps, type CampSearchResult } from '@/lib/api'
import { Events } from '@/lib/analytics'
import CampCard from '@/components/CampCard'


function SearchResults() {
  const params = useSearchParams()
  const router = useRouter()

  const location   = params.get('location') || ''
  const age        = params.get('age') ? Number(params.get('age')) : undefined
  const camp_type  = params.get('camp_type') || undefined
  const category   = params.get('category') || undefined

  const [results, setResults]     = useState<CampSearchResult[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  // Search form state (for inline re-search)
  const [loc, setLoc]       = useState(location)
  const [ageVal, setAgeVal] = useState(age?.toString() ?? '')

  useEffect(() => {
    if (!location) return
    setLoading(true)
    setError('')
    Events.searchSubmitted({ location, age, camp_type, category })

    searchCamps({
      location,
      age,
      camp_type,
      categories: category ? [category] : undefined,
      limit: 20,
    })
      .then(data => {
        setResults(data.results)
        Events.resultsViewed({ count: data.total, location })
      })
      .catch(() => setError('Search failed. Please try again.'))
      .finally(() => setLoading(false))
  }, [location, age, camp_type, category])

  function handleReSearch(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams({ location: loc })
    if (ageVal) p.set('age', ageVal)
    router.push(`/search?${p.toString()}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Compact re-search bar */}
      <form onSubmit={handleReSearch} className="flex gap-2 mb-8 flex-wrap bg-white border border-line rounded-2xl p-2 animate-rise-in">
        <input
          value={loc}
          onChange={e => setLoc(e.target.value)}
          placeholder="Location"
          className="flex-1 min-w-[160px] px-4 py-2.5 bg-paper border border-transparent rounded-xl text-sm outline-none transition-colors focus:border-navy focus:bg-white"
        />
        <input
          type="number"
          value={ageVal}
          onChange={e => setAgeVal(e.target.value)}
          placeholder="Age"
          min={3} max={18}
          className="w-24 px-4 py-2.5 bg-paper border border-transparent rounded-xl text-sm outline-none transition-colors focus:border-navy focus:bg-white"
        />
        <button
          type="submit"
          className="btn-lift bg-navy text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-night"
        >
          Search
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white border border-line rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-16 text-red-600">{error}</div>
      )}

      {/* No results */}
      {!loading && !error && results.length === 0 && (
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-navy mb-2">No camps found near {location}.</h2>
          <p className="text-sm text-muted">Try a nearby city or expand your search radius.</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          <p className="text-sm text-muted mb-4" data-reveal>
            <span className="font-display font-bold text-navy text-base">{results.length}</span> camp{results.length !== 1 ? 's' : ''} near <strong>{location}</strong>
            {age ? ` for age ${age}` : ''}
          </p>

          <div className="space-y-4">
            {results.map((camp, i) => (
              <div key={camp.id} data-reveal>
                <CampCard camp={camp} rank={i + 1} />
              </div>
            ))}
          </div>

        </>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-16 text-center text-muted">Loading...</div>}>
      <SearchResults />
    </Suspense>
  )
}
