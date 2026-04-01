import type { SupabaseClient } from '@supabase/supabase-js'
import { PORTFOLIO_EXPLORE_SELECT } from './constants'
import { mapPortfolioRowToFeedItem } from './mapRowToFeedItem'
import type { PortfolioExploreDbRow } from './types'

export async function fetchPortfolioItemById(
  supabase: SupabaseClient,
  portfolioItemId: string,
): Promise<{ item: ReturnType<typeof mapPortfolioRowToFeedItem> | null; error: string | null }> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select(PORTFOLIO_EXPLORE_SELECT)
    .eq('id', portfolioItemId)
    .eq('published', true)
    .maybeSingle()

  if (error) {
    return { item: null, error: error.message }
  }
  const row = data as PortfolioExploreDbRow | null
  if (!row || !row.professionals?.published) {
    return { item: null, error: null }
  }
  return { item: mapPortfolioRowToFeedItem(row), error: null }
}
