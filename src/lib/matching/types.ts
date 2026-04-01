/** Row shape from `match_requests` (service role read). */
export type MatchRequestRecord = {
  id: string
  user_id: string
  category: string | null
  location_text: string | null
  tags: string[]
  vision_notes: string | null
  desired_style_text: string | null
  current_state_text: string | null
  budget_min: string | number | null
  budget_max: string | number | null
  inspiration_image_path: string | null
  current_photo_path: string | null
  saved_look_portfolio_item_id: string | null
}

export type ProfessionalRecord = {
  id: string
  display_name: string
  title: string
  city: string
  rating: string | number | null
  review_count: number
  years_experience: number | null
  about: string | null
  category: string
  published: boolean
}

export type PortfolioItemRecord = {
  id: string
  professional_id: string
  service_title: string
  category: string
  price: string | number | null
  before_image_path: string | null
  after_image_path: string | null
  published: boolean
}

/** One published portfolio item with joined pro + tags (catalog row). */
export type CatalogPortfolioRow = PortfolioItemRecord & {
  professionals: ProfessionalRecord
  portfolio_item_tags: { tag: string }[] | null
}

/** One component’s contribution before summing into total (0..max). */
export type ComponentScore = {
  key: string
  points: number
  max: number
  /** Optional human-readable fragment for reasons */
  label?: string
}

export type ScoredPortfolioItem = {
  portfolio_item_id: string
  professional_id: string
  total: number
  components: ComponentScore[]
  reasons: string[]
}

export type MatchEngineSuccess = {
  ok: true
  match_result_id: string
  match_request_id: string
  ranker_version: string
  rows_written: number
  /** Top rows for logging / tests */
  top: ScoredPortfolioItem[]
}

export type MatchEngineFailure = {
  ok: false
  match_request_id: string
  error: string
  /** If we created/updated a failed match_results row */
  match_result_id?: string
}

export type MatchEngineResult = MatchEngineSuccess | MatchEngineFailure

/** Payload mirror for clients that read jsonb only */
export type MatchResultsPayloadV1 = {
  version: 1
  ranker_version: string
  generated_at: string
  match_request_id: string
  top: {
    rank: number
    portfolio_item_id: string
    professional_id: string
    total_score: number
    component_scores: Record<string, number>
    reasons: string[]
  }[]
}

export type { Json } from './json'
