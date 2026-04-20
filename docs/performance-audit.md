# Performance And Responsiveness Audit

Date: 2026-04-15

## High

- Shared Explore data is fetched repeatedly with no cross-screen cache. Affected: `src/hooks/useExplorePortfolio.ts`, `mobile/hooks/useExplorePortfolio.ts`, `src/pages/MatchPage.tsx`, `src/pages/SavedPage.tsx`, `mobile/app/(tabs)/explore/[id].tsx`, `mobile/app/pro/[id].tsx`. Fix: move Explore catalog loading into a shared query/provider with deduping, `staleTime`, and prefetch for detail/profile routes.
- Explore fetches pull the whole catalog up front in large pages. Affected: `src/lib/explore/fetchPublishedPortfolio.ts`, `mobile/lib/explore/fetchPublishedPortfolio.ts`. Fix: reduce page size, switch to incremental pagination or infinite scroll, and render the first page immediately.
- Mobile match results intentionally wait before rendering. Affected: `mobile/app/(tabs)/match/results.tsx`. Fix: remove the fixed 1.2s delay and only show loading when real async work is happening.
- Web Explore renders every card at once. Affected: `src/pages/ExplorePage.tsx`. Fix: virtualize the grid/list and combine it with paginated data loading.
- Portfolio thumbnails use full public image URLs with inconsistent caching. Affected: `src/lib/explore/mapRowToFeedItem.ts`, `mobile/lib/explore/mapRowToFeedItem.ts`, `mobile/components/explore/PortfolioCard.tsx`. Fix: serve transformed thumbnails, add placeholders, and standardize image cache policy.
- Mobile Profile blocks on a full refetch whenever the tab regains focus. Affected: `mobile/app/(tabs)/profile.tsx`. Fix: keep stale content visible during background refresh and avoid resetting the whole screen to loading.

## Medium

- Loading states are inconsistent and often too bare. Affected: `src/pages/ExploreDetailPage.tsx`, `src/components/layout/RequireOnboardingComplete.tsx`, `mobile/app/(tabs)/explore/index.tsx`. Fix: replace plain loading text with layout-matched skeletons, keep previous content visible during refetch, and show retry UI on errors.
- Match engine and polling network handling are brittle. Affected: `src/lib/match/triggerMatchEngine.ts`, `src/hooks/useMatchRunResults.ts`. Fix: add request timeouts, bounded retries/backoff, and reuse one client instance per polling session.
- Match/request submission flows are long and mostly sequential. Affected: `src/lib/match/submitMatchFlow.ts`, `mobile/components/booking/RequestBookingModal.tsx`, `src/components/explore/RequestModal.tsx`. Fix: separate critical writes from secondary notify/upload work, show step-specific progress, and support retry for partial failures.
- Web routes are eagerly loaded. Affected: `src/App.tsx`. Fix: lazy-load route components and wrap them in `Suspense` with route skeletons.
- Mobile saved-state persistence can hurt responsiveness and correctness. Affected: `mobile/contexts/SavedProvider.tsx`. Fix: debounce AsyncStorage writes and merge pending in-memory actions with hydrated state.

## Low

- Some motion effects cost more than they return. Affected: `src/components/explore/PortfolioCard.tsx`, mobile glass/tab chrome components. Fix: shorten long transform transitions and provide lower-cost fallbacks for reduced-motion or lower-end devices.
- Explore personalization adds extra boot-time network work. Affected: `src/hooks/useExplorePersonalization.ts`. Fix: cache onboarding state for the session and reuse it across Explore and gating flows.
- Strong skeleton/loading patterns already exist in match results but are not reused broadly. Fix: standardize that pattern across detail, gate, and profile-loading screens.

## Key Evidence

```ts
// mobile/app/(tabs)/match/results.tsx
useEffect(() => {
  const t = setTimeout(() => setPending(false), 1200)
  return () => clearTimeout(t)
}, [])
```

```ts
// src/hooks/useExplorePortfolio.ts
const load = useCallback(async () => {
  setLoading(true)
  setError(null)
  const supabase = createClient()
  const { items: next, error: err } = await fetchPublishedPortfolioItems(supabase)
  ...
}, [])
```

```ts
// src/lib/explore/fetchPublishedPortfolio.ts
for (;;) {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select(PORTFOLIO_EXPLORE_SELECT)
    .range(from, from + EXPLORE_PAGE_SIZE - 1)
  ...
  if (rows.length < EXPLORE_PAGE_SIZE) break
  from += EXPLORE_PAGE_SIZE
}
```

```ts
// src/pages/ExplorePage.tsx
{orderedForDisplay.map((item) => (
  <PortfolioCard key={item.id} item={item} view={viewMode} />
))}
```

```ts
// mobile/app/(tabs)/profile.tsx
useFocusEffect(
  useCallback(() => {
    void reload()
  }, [reload]),
)
```

```ts
// src/lib/match/triggerMatchEngine.ts
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ match_request_id: matchRequestId }),
})
```

## Recommended Fix Order

1. Add shared catalog caching and deduplication for Explore, Saved, Match, detail, and pro screens.
2. Replace full-catalog upfront loading with paginated or infinite loading.
3. Remove fake mobile match delay and stop blocking Profile on refocus.
4. Add thumbnail transforms, placeholders, and consistent image caching.
5. Improve loading, retry, and fallback states for detail and network-heavy flows.
6. Lazy-load web routes and tighten polling/timeout behavior.

## Notes

- This audit is based on code inspection rather than runtime instrumentation.
- The highest-value next step is profiling `Explore`, `Profile`, and `Match` on throttled network/device settings to confirm which hotspots are most expensive in practice.
