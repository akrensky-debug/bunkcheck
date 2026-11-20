'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { nearestPlace, searchCamps, type CampSearchResult } from '@/lib/api'
import { Events } from '@/lib/analytics'
import CampCard from '@/components/CampCard'
import { Button, Container, EmptyState, List, SearchBar, SearchField, Skeleton, Text, TextLink } from '@/components/ui'


function SearchResults() {
  const params = useSearchParams()
  const router = useRouter()

  const location   = params.get('location') || ''
  const age        = params.get('age') ? Number(params.get('age')) : undefined
  const camp_type  = params.get('camp_type') || undefined
  const category   = params.get('category') || undefined

  const [results, setResults]     = useState<CampSearchResult[]>([])
  const [loading, setLoading]     = useState(!!location)
  const [error, setError]         = useState('')
  const [locating, setLocating]   = useState(false)
  const [locError, setLocError]   = useState('')

  // Search form state (for inline re-search)
  const [loc, setLoc]       = useState(location)
  const [ageVal, setAgeVal] = useState(age?.toString() ?? '')

  useEffect(() => {
    if (!location) { setLoading(false); return }
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

  function go(where: string) {
    const p = new URLSearchParams({ location: where })
    if (ageVal) p.set('age', ageVal)
    router.push(`/search?${p.toString()}`)
  }

  function handleReSearch(e: React.FormEvent) {
    e.preventDefault()
    go(loc)
  }

  // Near me: the browser asks permission, we turn the position into the nearest town we know and
  // search that. The position itself goes no further than that one lookup.
  function nearMe() {
    setLocError('')
    if (!('geolocation' in navigator)) { setLocError('This browser can\u2019t share your location. Type your town instead.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const town = await nearestPlace(pos.coords.latitude, pos.coords.longitude)
          setLoc(town)
          go(town)
        } catch (e) {
          setLocError(e instanceof Error ? e.message : 'Couldn\u2019t find your town. Type it instead.')
        } finally {
          setLocating(false)
        }
      },
      err => {
        setLocating(false)
        setLocError(err.code === err.PERMISSION_DENIED
          ? 'Location is turned off for this site. Type your town instead.'
          : 'Couldn\u2019t find your location. Type your town instead.')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
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
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-2">
        <Button variant="link" size="sm" leadingIcon="near-me" onClick={nearMe} disabled={locating}>
          {locating ? 'Finding your town\u2026' : 'Use my location'}
        </Button>
        {locError && <Text variant="small" tone="muted" role="status">{locError}</Text>}
      </div>

      <div className="mt-10">
        {!location && !loading && (
          <EmptyState
            title="Where should we look?"
            description="Type your town, or use your location."
          />
        )}
        {loading && <Skeleton rows={4} />}

        {!loading && error && <p className="py-16 text-center text-small text-error">{error}</p>}

        {location && !loading && !error && results.length === 0 && (
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
            <Text variant="small" tone="muted" className="mt-8">
              Rather ask in your own words? <TextLink href="/connect" arrow>Use Bunkcheck in Claude</TextLink>
            </Text>
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
