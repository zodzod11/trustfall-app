import type { ServiceCategory } from '../../types'
import type { OnboardingState } from '../../services/onboarding/types'
import { applyExploreFilters } from './applyExploreFilters'
import type { ExploreFilterablePortfolioItem, ExplorePortfolioFilters } from './types'

/**
 * Subset of onboarding used for Explore — contact preference excluded (not used for ranking).
 */
export type ExplorePersonalizationPrefs = {
  categories: string[]
  styleTags: string[]
  location: string
  /** Persisted metadata only; surfaced in copy, not ranking. */
  inspirationFileName: string
}

export function prefsFromOnboardingState(
  state: OnboardingState | null,
): ExplorePersonalizationPrefs | null {
  if (!state) return null
  const categories = Array.isArray(state.categories) ? state.categories : []
  const styleTags = Array.isArray(state.styleTags) ? state.styleTags : []
  const location = typeof state.location === 'string' ? state.location : ''
  const inspirationFileName =
    typeof state.inspirationFileName === 'string' ? state.inspirationFileName : ''
  return {
    categories,
    styleTags,
    location: location.trim(),
    inspirationFileName: inspirationFileName.trim(),
  }
}

function pickCategory(catalog: ServiceCategory[], prefs: string[]): ServiceCategory | 'all' {
  for (const p of prefs) {
    if (catalog.includes(p as ServiceCategory)) return p as ServiceCategory
  }
  return 'all'
}

function pickTag(catalogTags: string[], styleTags: string[]): string {
  const catalogLower = new Map(catalogTags.map((t) => [t.toLowerCase(), t] as const))
  for (const st of styleTags) {
    const hit = catalogLower.get(st.toLowerCase())
    if (hit) return hit
  }
  return 'all'
}

/** Match user city text to a value in the live catalog (substring / case-insensitive). */
export function matchLocationToCatalog(pref: string, catalogLocations: string[]): string {
  const p = pref.trim().toLowerCase()
  if (!p) return 'all'
  const exact = catalogLocations.find((l) => l.toLowerCase() === p)
  if (exact) return exact
  const partial = catalogLocations.find(
    (l) => l.toLowerCase().includes(p) || p.includes(l.toLowerCase()),
  )
  return partial ?? 'all'
}

/**
 * Build a first-pass filter from onboarding + catalog options. May yield zero results;
 * use {@link relaxExploreFiltersUntilNonEmpty} before applying as defaults.
 */
export function buildCandidateExploreFilters(
  prefs: ExplorePersonalizationPrefs | null,
  catalog: {
    categories: ServiceCategory[]
    locations: string[]
    tags: string[]
  },
): ExplorePortfolioFilters {
  if (!prefs) {
    return { category: 'all', location: 'all', tag: 'all' }
  }
  const category = pickCategory(catalog.categories, prefs.categories)
  const location =
    prefs.location && catalog.locations.length > 0
      ? matchLocationToCatalog(prefs.location, catalog.locations)
      : 'all'
  const tag =
    prefs.styleTags.length > 0 && catalog.tags.length > 0
      ? pickTag(catalog.tags, prefs.styleTags)
      : 'all'
  return { category, location, tag }
}

const RELAX_ORDER = ['tag', 'location', 'category'] as const

/**
 * Softens filters so the grid is not empty when possible — never hard-blocks browsing.
 */
export function relaxExploreFiltersUntilNonEmpty(
  items: ExploreFilterablePortfolioItem[],
  filters: ExplorePortfolioFilters,
): ExplorePortfolioFilters {
  let current: ExplorePortfolioFilters = { ...filters }
  if (applyExploreFilters(items, current).length > 0) return current

  for (const key of RELAX_ORDER) {
    if (key === 'tag') current = { ...current, tag: 'all' }
    else if (key === 'location') current = { ...current, location: 'all' }
    else current = { ...current, category: 'all' }
    if (applyExploreFilters(items, current).length > 0) return current
  }
  return { category: 'all', location: 'all', tag: 'all' }
}

export function deriveSuggestedExploreFilters(
  items: ExploreFilterablePortfolioItem[],
  prefs: ExplorePersonalizationPrefs | null,
  catalog: {
    categories: ServiceCategory[]
    locations: string[]
    tags: string[]
  },
): ExplorePortfolioFilters {
  const candidate = buildCandidateExploreFilters(prefs, catalog)
  if (items.length === 0) return candidate
  return relaxExploreFiltersUntilNonEmpty(items, candidate)
}

