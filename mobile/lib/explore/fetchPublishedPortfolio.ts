import type { SupabaseClient } from '@supabase/supabase-js'
import type { PortfolioFeedItem } from '@/types'
import {
  EXPLORE_PAGE_SIZE,
  LEGACY_PORTFOLIO_EXPLORE_SELECT,
  PORTFOLIO_EXPLORE_SELECT,
} from './constants'
import { mapPortfolioRowToFeedItem } from './mapRowToFeedItem'
import type { PortfolioExploreDbRow } from './types'

export type ExplorePortfolioFetchResult = {
  items: PortfolioFeedItem[]
  error: string | null
}

function isMissingRequestCountError(error: { message?: string; code?: string } | null) {
  return error?.code === '42703' && /request_count/i.test(error.message ?? '')
}

export async function fetchPublishedPortfolioItems(
  supabase: SupabaseClient,
): Promise<ExplorePortfolioFetchResult> {
  const items: PortfolioFeedItem[] = []
  let from = 0

  for (;;) {
    let select = PORTFOLIO_EXPLORE_SELECT
    let query = await supabase
      .from('portfolio_items')
      .select(select)
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + EXPLORE_PAGE_SIZE - 1)

    if (query.error && isMissingRequestCountError(query.error)) {
      select = LEGACY_PORTFOLIO_EXPLORE_SELECT
      query = await supabase
        .from('portfolio_items')
        .select(select)
        .eq('published', true)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + EXPLORE_PAGE_SIZE - 1)
    }

    const { data, error } = query

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
