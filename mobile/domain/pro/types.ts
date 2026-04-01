/**
 * Pro-side domain types — portfolio-first views and service inputs.
 * DB rows remain in `@/types/database`; these are boundaries for UI and services.
 */

import type { ContactRequestRow, PortfolioItemRow, ProfessionalRow } from '@/types/database'

/** Input for creating a `professionals` row (owner = current user at insert time). */
export interface CreateProfessionalInput {
  slug: string
  display_name: string
  title: string
  category: string
  city: string
  rating?: string | null
  review_count?: number
  years_experience?: number | null
  about?: string | null
  booking_phone?: string | null
  booking_email?: string | null
  /** Default true; set false to save as draft catalog. */
  published?: boolean
}

/** Patch for updating the signed-in pro’s `professionals` row. */
export type UpdateProfessionalInput = Partial<
  Pick<
    CreateProfessionalInput,
    | 'slug'
    | 'display_name'
    | 'title'
    | 'category'
    | 'city'
    | 'years_experience'
    | 'about'
    | 'booking_phone'
    | 'booking_email'
    | 'published'
  >
> & {
  rating?: string | null
  review_count?: number
}

/** Input for creating a portfolio item (portfolio-first: required service + category). */
export interface CreatePortfolioItemInput {
  professional_id: string
  service_title: string
  category: string
  price?: string | null
  before_image_path?: string | null
  after_image_path?: string | null
  sort_order?: number
  published?: boolean
  /** Optional; can also call `replacePortfolioItemTags` after insert. */
  tags?: string[]
}

export type UpdatePortfolioItemInput = Partial<
  Pick<
    CreatePortfolioItemInput,
    'service_title' | 'category' | 'price' | 'before_image_path' | 'after_image_path' | 'sort_order' | 'published'
  >
>

/**
 * Published portfolio row for Explore — portfolio item is primary; pro fields are denormalized for listing cards.
 */
export interface ExplorePortfolioItem {
  portfolio: PortfolioItemRow
  professional: Pick<
    ProfessionalRow,
    | 'id'
    | 'slug'
    | 'display_name'
    | 'title'
    | 'city'
    | 'category'
    | 'rating'
    | 'review_count'
    | 'published'
  >
  tags: string[]
}

export interface ExploreCatalogQuery {
  /** Filter by portfolio item category (optional). */
  category?: string
  limit?: number
  offset?: number
}

/** Pro dashboard: own professional + all portfolio items (incl. drafts) with tags. */
export interface ProDashboardSnapshot {
  /** Null when the user has not created a `professionals` row yet. */
  professional: ProfessionalRow | null
  items: Array<PortfolioItemRow & { tags: string[] }>
}

/** Optional inbox summary for dashboard header (same owner as professional). */
export interface ProDashboardInboxSummary {
  pending_contact_requests: number
}

export interface ProDashboardBundle {
  dashboard: ProDashboardSnapshot
  inbox?: ProDashboardInboxSummary
}

/** Raw row shape when selecting portfolio_items with embedded professionals + tags. */
export type PortfolioItemExploreRow = PortfolioItemRow & {
  professionals: Pick<
    ProfessionalRow,
    | 'id'
    | 'slug'
    | 'display_name'
    | 'title'
    | 'city'
    | 'category'
    | 'rating'
    | 'review_count'
    | 'published'
  >
  portfolio_item_tags?: { tag: string }[] | null
}

export type ContactRequestRowInbox = Pick<
  ContactRequestRow,
  'id' | 'status' | 'created_at' | 'user_id' | 'portfolio_item_id' | 'message'
>
