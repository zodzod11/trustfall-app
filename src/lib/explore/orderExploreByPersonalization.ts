import type { ExploreFilterablePortfolioItem } from './types'
import type { ExplorePersonalizationPrefs } from './personalizationFromOnboarding'

/**
 * Portfolio-first: full feed stays visible; matching onboarding signals float to the top
 * without hiding the rest (users can still scroll everywhere).
 */
export function orderExploreByPersonalization<T extends ExploreFilterablePortfolioItem>(
  items: T[],
  prefs: ExplorePersonalizationPrefs | null,
): T[] {
  if (!prefs || items.length === 0) return items

  const prefCats = new Set(prefs.categories.map((c) => c.toLowerCase()))
  const prefTags = new Set(prefs.styleTags.map((t) => t.toLowerCase()))
  const loc = prefs.location.trim().toLowerCase()

  const scored = items.map((item, originalIndex) => ({
    item,
    originalIndex,
    score: scorePortfolioItem(item, prefCats, prefTags, loc),
  }))

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.originalIndex - b.originalIndex
  })

  return scored.map((s) => s.item)
}

function scorePortfolioItem(
  item: ExploreFilterablePortfolioItem,
  prefCats: Set<string>,
  prefTags: Set<string>,
  loc: string,
): number {
  let s = 0
  if (prefCats.has(item.category.toLowerCase())) s += 4
  for (const t of item.tags) {
    if (prefTags.has(t.toLowerCase())) s += 2
  }
  if (loc) {
    const il = item.location.toLowerCase()
    if (il === loc) s += 3
    else if (il.includes(loc) || loc.includes(il)) s += 1
  }
  return s
}
