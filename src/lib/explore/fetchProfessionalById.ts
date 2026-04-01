import type { SupabaseClient } from '@supabase/supabase-js'
import { PORTFOLIO_EXPLORE_SELECT } from './constants'
import { mapPortfolioRowToFeedItem } from './mapRowToFeedItem'
import type { PortfolioExploreDbRow } from './types'

/**
 * Loads one professional’s published portfolio rows with the same shape as Explore.
 */
export async function fetchPublishedPortfolioItemsForProfessional(
  supabase: SupabaseClient,
  professionalId: string,
): Promise<{ items: ReturnType<typeof mapPortfolioRowToFeedItem>[]; error: string | null }> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select(PORTFOLIO_EXPLORE_SELECT)
    .eq('professional_id', professionalId)
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    return { items: [], error: error.message }
  }

  const rows = (data ?? []) as unknown as PortfolioExploreDbRow[]
  const items = rows
    .filter((r) => r.professionals?.published)
    .map((r) => mapPortfolioRowToFeedItem(r))

  return { items, error: null }
}
