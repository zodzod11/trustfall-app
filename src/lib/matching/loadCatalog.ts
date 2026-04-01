import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogPortfolioRow } from './types'

const SELECT = `
  id,
  professional_id,
  service_title,
  category,
  price,
  before_image_path,
  after_image_path,
  published,
  professionals!inner (
    id,
    display_name,
    title,
    city,
    rating,
    review_count,
    years_experience,
    about,
    category,
    published
  ),
  portfolio_item_tags (tag)
`.trim()

/**
 * Loads all published portfolio items with published professionals and tags.
 * Paginates in 1k chunks so large catalogs stay within PostgREST limits.
 */
export async function loadPublishedCatalog(
  supabase: SupabaseClient,
): Promise<{ rows: CatalogPortfolioRow[]; error: string | null }> {
  const pageSize = 1000
  const rows: CatalogPortfolioRow[] = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select(SELECT)
      .eq('published', true)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      return { rows: [], error: error.message }
    }
    const chunk = (data ?? []) as unknown as CatalogPortfolioRow[]
    for (const raw of chunk) {
      const pro = raw.professionals
      if (!pro?.published) continue
      if (!raw.published) continue
      rows.push(raw)
    }
    if (chunk.length < pageSize) break
    from += pageSize
  }

  return { rows, error: null }
}
