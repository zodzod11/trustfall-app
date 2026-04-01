import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import { FilterBar } from '../components/explore/FilterBar'
import { PortfolioCard, type PortfolioFeedItem } from '../components/explore/PortfolioCard'
import { useExplorePersonalization } from '../hooks/useExplorePersonalization'
import { useExplorePortfolio } from '../hooks/useExplorePortfolio'
import { applyExploreFilters, orderExploreByPersonalization } from '../lib/explore'
import { createClient } from '../lib/client'
import { createOnboardingApi } from '../services/onboarding'
import type { ServiceCategory } from '../types'
import { cn } from '../utils/cn'

const RECENT_SEARCHES_KEY = 'trustfall:recent-searches:v1'
const SUGGESTED_PROMPTS = ['Low taper fade', 'Soft glam makeup', 'Natural braids']

function readInitialRecentSearches() {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as string[]
    return parsed.slice(0, 6)
  } catch {
    return []
  }
}

export function ExplorePage() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    readInitialRecentSearches(),
  )
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>(
    'all',
  )
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedTag, setSelectedTag] = useState('all')

  const { items: portfolioFeed, loading: catalogLoading, error: catalogError } =
    useExplorePortfolio()

  const exploreOnboardingApi = useMemo(() => createOnboardingApi(createClient()), [])

  const categories = useMemo(
    () =>
      Array.from(
        new Set(portfolioFeed.map((item) => item.category)),
      ) as ServiceCategory[],
    [portfolioFeed],
  )

  const locations = useMemo(
    () => Array.from(new Set(portfolioFeed.map((item) => item.location))).sort(),
    [portfolioFeed],
  )

  const tags = useMemo(
    () => Array.from(new Set(portfolioFeed.flatMap((item) => item.tags))).sort(),
    [portfolioFeed],
  )

  const explorePersonalization = useExplorePersonalization({
    portfolioFeed,
    catalogCategories: categories,
    catalogLocations: locations,
    catalogTags: tags,
    api: exploreOnboardingApi,
  })

  const exploreDefaultsAppliedRef = useRef(false)
  useEffect(() => {
    if (catalogLoading || explorePersonalization.status !== 'ready' || portfolioFeed.length === 0) {
      return
    }
    if (exploreDefaultsAppliedRef.current) return
    exploreDefaultsAppliedRef.current = true
    setSelectedCategory(explorePersonalization.suggestedFilters.category)
    setSelectedLocation(explorePersonalization.suggestedFilters.location)
    setSelectedTag(explorePersonalization.suggestedFilters.tag)
  }, [
    catalogLoading,
    explorePersonalization.status,
    explorePersonalization.suggestedFilters,
    portfolioFeed.length,
  ])

  const exploreFilters = useMemo(
    () => ({
      category: selectedCategory,
      location: selectedLocation,
      tag: selectedTag,
    }),
    [selectedCategory, selectedLocation, selectedTag],
  )

  const filteredItems = useMemo(
    () => applyExploreFilters(portfolioFeed, exploreFilters),
    [portfolioFeed, exploreFilters],
  )

  useEffect(() => {
    if (!isSearchOpen) return
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 40)
    return () => window.clearTimeout(timer)
  }, [isSearchOpen])

  const orderedForDisplay = useMemo(
    () => orderExploreByPersonalization(filteredItems, explorePersonalization.prefs),
    [filteredItems, explorePersonalization.prefs],
  )

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return orderedForDisplay
    return orderedForDisplay.filter((item) => {
      const haystack = [
        item.serviceTitle,
        item.professionalName,
        item.professionalTitle,
        item.location,
        item.category,
        ...item.tags,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [orderedForDisplay, searchQuery])

  const visibleCount = searchQuery.trim() ? searchResults.length : orderedForDisplay.length

  function saveRecentSearch(term: string) {
    const normalized = term.trim()
    if (!normalized) return
    setRecentSearches((current) => {
      const next = [normalized, ...current.filter((x) => x !== normalized)].slice(0, 6)
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      return next
    })
  }

  function openSearchWithTerm(term?: string) {
    setIsSearchOpen(true)
    if (term !== undefined) {
      setSearchQuery(term)
      saveRecentSearch(term)
    }
  }

  function closeSearch() {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery)
    }
    setIsSearchOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="space-y-5">
      <header className="sticky top-0 z-20 -mx-4 border-b border-white/5 bg-background/80 px-4 pb-4 pt-1 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <div className="grid grid-cols-[auto_1fr_44px] items-center gap-1">
          <Link
            to="/explore"
            aria-label="Trustfall home"
            className="group inline-flex min-h-10 min-w-0 max-w-[min(120px,28vw)] items-center justify-start rounded-lg px-0.5 transition hover:bg-surface-elevated/80"
          >
            <TrustfallLogo size="header" className="max-h-8" />
          </Link>
          <h1 className="text-center text-[2rem] font-semibold tracking-tight text-primary">
            Explore
          </h1>
          <div className="flex justify-end">
            <button
              type="button"
              aria-label="Search"
              onClick={() => openSearchWithTerm()}
              className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition hover:bg-surface-elevated"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 px-0.5">
        <p className="text-xs font-medium text-muted/90">
          {catalogLoading
            ? 'Loading…'
            : `${visibleCount} result${visibleCount === 1 ? '' : 's'}`}
        </p>
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              viewMode === 'grid'
                ? 'bg-primary/20 text-foreground'
                : 'text-muted hover:text-secondary',
            )}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              viewMode === 'list'
                ? 'bg-primary/20 text-foreground'
                : 'text-muted hover:text-secondary',
            )}
          >
            List
          </button>
        </div>
      </div>

      {catalogError ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {catalogError}
        </p>
      ) : null}

      {explorePersonalization.hint ? (
        <p className="px-0.5 text-xs leading-relaxed text-muted/90">{explorePersonalization.hint}</p>
      ) : null}

      <FilterBar
        categories={categories}
        locations={locations}
        tags={tags}
        selectedCategory={selectedCategory}
        selectedLocation={selectedLocation}
        selectedTag={selectedTag}
        onCategoryChange={setSelectedCategory}
        onLocationChange={setSelectedLocation}
        onTagChange={setSelectedTag}
      />

      <div
        className={cn(
          'grid',
          viewMode === 'list'
            ? 'grid-cols-1 gap-5'
            : 'grid-cols-2 gap-x-4 gap-y-8',
        )}
      >
        {orderedForDisplay.map((item) => (
          <PortfolioCard key={item.id} item={item} view={viewMode} />
        ))}
      </div>

      {!catalogLoading && orderedForDisplay.length === 0 ? (
        <EmptyState
          category={selectedCategory}
          location={selectedLocation}
          tag={selectedTag}
        />
      ) : null}

      {isSearchOpen ? (
        <SearchOverlay
          inputRef={searchInputRef}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onClose={closeSearch}
          recentSearches={recentSearches}
          suggestedPrompts={SUGGESTED_PROMPTS}
          onPromptClick={(value) => {
            setSearchQuery(value)
            saveRecentSearch(value)
          }}
          results={searchResults}
          viewMode={viewMode}
        />
      ) : null}
    </div>
  )
}

type EmptyStateProps = {
  category: ServiceCategory | 'all'
  location: string
  tag: string
}

function EmptyState({ category, location, tag }: EmptyStateProps) {
  return (
    <div className="tf-card px-5 py-8 text-center">
      <p className="text-base font-semibold text-secondary">
        No portfolio matches these filters yet.
      </p>
      <p className="mt-1 text-xs text-muted">
        Category: {category} · Location: {location} · Tag: {tag}
      </p>
      <p className="mt-3 text-xs text-muted/90">
        Try broadening one filter to see more premium looks.
      </p>
    </div>
  )
}

type SearchOverlayProps = {
  inputRef: RefObject<HTMLInputElement | null>
  query: string
  onQueryChange: (value: string) => void
  onClose: () => void
  recentSearches: string[]
  suggestedPrompts: string[]
  onPromptClick: (value: string) => void
  results: PortfolioFeedItem[]
  viewMode: 'list' | 'grid'
}

function SearchOverlay({
  inputRef,
  query,
  onQueryChange,
  onClose,
  recentSearches,
  suggestedPrompts,
  onPromptClick,
  results,
  viewMode,
}: SearchOverlayProps) {
  const showDiscovery = query.trim().length === 0

  return (
    <div className="fixed inset-0 z-[65] bg-background/98 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-28 pt-[calc(0.9rem+env(safe-area-inset-top))] sm:px-5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search styles, pros, tags..."
              className="tf-input h-11 rounded-xl pr-9"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted"
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-2 text-sm font-medium text-accent"
          >
            Cancel
          </button>
        </div>

        {showDiscovery ? (
          <div className="tf-no-scrollbar mt-5 space-y-5 overflow-y-auto">
            {recentSearches.length > 0 ? (
              <section className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/85">
                  Recent
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => onPromptClick(term)}
                      className="rounded-xl border border-border bg-surface-elevated px-4 py-2 text-xs font-medium text-secondary"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/85">
                Suggested
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onPromptClick(prompt)}
                    className="rounded-xl border border-border bg-surface-elevated px-4 py-2 text-xs font-medium text-secondary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="tf-no-scrollbar mt-4 flex-1 overflow-y-auto">
            {results.length > 0 ? (
              <div
                className={cn(
                  'grid',
                  viewMode === 'list'
                    ? 'grid-cols-1 gap-5'
                    : 'grid-cols-2 gap-x-4 gap-y-8',
                )}
              >
                {results.map((item) => (
                  <PortfolioCard key={item.id} item={item} view={viewMode} />
                ))}
              </div>
            ) : (
              <div className="tf-card mt-3 px-5 py-8 text-center">
                <p className="text-base font-semibold text-secondary">No results found</p>
                <p className="mt-1 text-xs text-muted">
                  Try a different style term, category, or location.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
