import type { SupabaseClient } from '@supabase/supabase-js'
import { EXPLORE_PAGE_SIZE, PORTFOLIO_EXPLORE_SELECT } from './constants'
import { mapPortfolioRowToFeedItem } from './mapRowToFeedItem'
import type { PortfolioFeedItem } from '../../components/explore/PortfolioCard'
import type { PortfolioExploreDbRow } from './types'

export type ExplorePortfolioFetchResult = {
  items: PortfolioFeedItem[]
  error: string | null
}

/**
 * Loads all published portfolio items for Explore (with published professionals + tags).
 * Paginates to stay within PostgREST row limits.
 */
export async function fetchPublishedPortfolioItems(
  supabase: SupabaseClient,
): Promise<ExplorePortfolioFetchResult> {
  const items: ExplorePortfolioFetchResult['items'] = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select(PORTFOLIO_EXPLORE_SELECT)
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + EXPLORE_PAGE_SIZE - 1)

    if (error) {
      return { items: [], error: error.message }
    }

    const rows = (data ?? []) as unknown as PortfolioExploreDbRow[]
    for (const row of rows) {
      if (!row.professionals?.published) continue
      items.push(mapPortfolioRowToFeedItem(row))
    }

    if (rows.length < EXPLORE_PAGE_SIZE) break
    from += EXPLORE_PAGE_SIZE
  }

  return { items, error: null }
}
