import type { ExploreFilterablePortfolioItem, ExplorePortfolioFilters } from './types'

function priceInBudget(
  price: number,
  budgetMin: number | null | undefined,
  budgetMax: number | null | undefined,
): boolean {
  const hasMin = budgetMin != null && Number.isFinite(budgetMin)
  const hasMax = budgetMax != null && Number.isFinite(budgetMax)
  if (!hasMin && !hasMax) return true
  if (hasMin && hasMax) {
    return price >= (budgetMin as number) && price <= (budgetMax as number)
  }
  if (hasMax) return price <= (budgetMax as number)
  return price >= (budgetMin as number)
}

/**
 * Portfolio-first filtering (client-side; pairs with `fetchPublishedPortfolioItems`).
 */
export function applyExploreFilters<T extends ExploreFilterablePortfolioItem>(
  items: T[],
  filters: ExplorePortfolioFilters,
): T[] {
  return items.filter((item) => {
    if (filters.category !== 'all' && item.category !== filters.category) {
      return false
    }
    if (filters.location !== 'all' && item.location !== filters.location) {
      return false
    }
    if (filters.tag !== 'all' && !item.tags.includes(filters.tag)) {
      return false
    }
    if (
      !priceInBudget(item.price, filters.budgetMin ?? null, filters.budgetMax ?? null)
    ) {
      return false
    }
    return true
  })
}
