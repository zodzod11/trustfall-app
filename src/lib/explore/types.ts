import type { ServiceCategory } from '../../types'

/** Raw row from Supabase (snake_case, nested professionals + tags). */
export type PortfolioExploreDbRow = {
  id: string
  professional_id: string
  service_title: string
  category: string
  price: string | number | null
  before_image_path: string | null
  after_image_path: string | null
  sort_order: number
  published: boolean
  professionals: {
    id: string
    slug: string
    display_name: string
    title: string
    city: string
    rating: string | number | null
    review_count: number
    years_experience: number | null
    about: string | null
    category: string
    booking_phone: string | null
    booking_email: string | null
    published: boolean
  }
  portfolio_item_tags: { tag: string }[] | null
}

/**
 * Minimal fields for filter + onboarding personalization (shared web/mobile).
 * `PortfolioFeedItem` satisfies this shape.
 */
export type ExploreFilterablePortfolioItem = {
  category: ServiceCategory
  location: string
  tags: string[]
  price: number
}

/** Client-side filters (portfolio-first: filter items, not pros). */
export type ExplorePortfolioFilters = {
  category: ServiceCategory | 'all'
  location: string
  tag: string
  /** Inclusive budget range when set (optional until UI exposes them). */
  budgetMin?: number | null
  budgetMax?: number | null
}
