import { useEffect, useMemo, useState } from 'react'
import {
  deriveSuggestedExploreFilters,
  prefsFromOnboardingState,
  type ExplorePersonalizationPrefs,
} from '../lib/explore/personalizationFromOnboarding'
import type { ExploreFilterablePortfolioItem } from '../lib/explore/types'
import type { OnboardingApi } from '../services/onboarding'
import type { OnboardingState } from '../services/onboarding/types'
import type { ServiceCategory } from '../types'

export type UseExplorePersonalizationResult = {
  status: 'loading' | 'ready'
  prefs: ExplorePersonalizationPrefs | null
  suggestedFilters: {
    category: ServiceCategory | 'all'
    location: string
    tag: string
  }
  /** One-line helper copy; null when no saved signals */
  hint: string | null
  hasPersonalization: boolean
}

/**
 * Loads onboarding-backed preferences and derives **soft** default filters for Explore
 * (relaxed so the grid is not empty when possible). Pair with one-time application in the page.
 */
export function useExplorePersonalization(options: {
  portfolioFeed: ExploreFilterablePortfolioItem[]
  catalogCategories: ServiceCategory[]
  catalogLocations: string[]
  catalogTags: string[]
  api: OnboardingApi
}): UseExplorePersonalizationResult {
  const api = options.api
  const [loadedState, setLoadedState] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api.getOnboardingState()
        if (cancelled) return
        if (res.error || res.data == null) {
          setLoadedState(null)
        } else {
          setLoadedState(res.data)
        }
      } catch {
        if (!cancelled) setLoadedState(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api])

  const prefs = useMemo(() => prefsFromOnboardingState(loadedState), [loadedState])

  const suggestedFilters = useMemo(
    () =>
      deriveSuggestedExploreFilters(
        options.portfolioFeed,
        prefs,
        {
          categories: options.catalogCategories,
          locations: options.catalogLocations,
          tags: options.catalogTags,
        },
      ),
    [
      options.portfolioFeed,
      options.catalogCategories,
      options.catalogLocations,
      options.catalogTags,
      prefs,
    ],
  )

  const hasPersonalization = Boolean(
    prefs &&
      (prefs.categories.length > 0 ||
        prefs.styleTags.length > 0 ||
        prefs.location.length > 0 ||
        prefs.inspirationFileName.length > 0),
  )

  const hint = useMemo(() => {
    if (!hasPersonalization) return null
    return 'Starting from your saved preferences — adjust filters anytime.'
  }, [hasPersonalization])

  return {
    status: loading ? 'loading' : 'ready',
    prefs,
    suggestedFilters,
    hint,
    hasPersonalization,
  }
}
