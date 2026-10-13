'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { searchCamps, type CampSearchResult } from '@/lib/api'
import { Events } from '@/lib/analytics'
import CampCard from '@/components/CampCard'
import { Container, EmptyState, List, SearchBar, SearchField, Skeleton } from '@/components/ui'


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
    <Container size="narrow" className="py-10 sm:py-14">
      <SearchBar onSubmit={handleReSearch}>
        <SearchField
          label="Where"
          grow
          value={loc}
          onChange={e => setLoc(e.target.value)}
          placeholder="Town or ZIP"
          autoComplete="address-level2"
        />
        <SearchField
          label="Age"
          type="number"
          inputMode="numeric"
          value={ageVal}
          onChange={e => setAgeVal(e.target.value)}
          placeholder="Any"
          min={3}
          max={18}
        />
      </SearchBar>

      <div className="mt-10">
        {loading && <Skeleton rows={4} />}

        {!loading && error && <p className="py-16 text-center text-small text-error">{error}</p>}

        {!loading && !error && results.length === 0 && (
          <EmptyState
            title={`No camps found near ${location}.`}
            description="Try a nearby town, or leave the age blank."
          />
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="mb-2 text-small text-muted">
              {results.length} camp{results.length !== 1 ? 's' : ''} near {location}
              {age ? ` for age ${age}` : ''}
            </p>
            <List>
              {results.map((camp, i) => <CampCard key={camp.id} camp={camp} rank={i + 1} />)}
            </List>
          </>
        )}
      </div>
    </Container>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Container className="py-16"><Skeleton rows={4} /></Container>}>
      <SearchResults />
    </Suspense>
  )
}
