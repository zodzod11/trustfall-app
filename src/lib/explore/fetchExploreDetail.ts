import type { SupabaseClient } from '@supabase/supabase-js'
import type { PortfolioFeedItem } from '../../components/explore/PortfolioCard'
import { fetchPortfolioItemById } from './fetchPortfolioItemById'
import { fetchPublishedPortfolioItemsForProfessional } from './fetchProfessionalById'

export type ExploreDetailBundle = {
  item: PortfolioFeedItem | null
  moreFromSamePro: PortfolioFeedItem[]
  error: string | null
}

/**
 * Detail route: primary portfolio item + up to four other published looks from the same pro.
 */
export async function fetchExploreDetailBundle(
  supabase: SupabaseClient,
  portfolioItemId: string,
): Promise<ExploreDetailBundle> {
  const { item, error } = await fetchPortfolioItemById(supabase, portfolioItemId)
  if (error) {
    return { item: null, moreFromSamePro: [], error }
  }
  if (!item) {
    return { item: null, moreFromSamePro: [], error: null }
  }

  const { items, error: e2 } = await fetchPublishedPortfolioItemsForProfessional(
    supabase,
    item.professionalId,
  )
  if (e2) {
    return { item, moreFromSamePro: [], error: e2 }
  }

  const moreFromSamePro = items
    .filter((i) => i.id !== item.id)
    .slice(0, 4)

  return { item, moreFromSamePro, error: null }
}
