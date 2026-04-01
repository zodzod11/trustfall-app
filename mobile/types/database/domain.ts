/**
 * App-facing / composed types — not 1:1 table rows. Use mappers in repositories to convert
 * from `*Row` types. Payload shapes should stay loose until the ranker contract is frozen.
 */

import type { Json } from './json'
import type {
  ContactRequestRow,
  MatchRequestRow,
  MatchResultRankingRow,
  MatchResultRow,
  PortfolioItemRow,
  ProfessionalRow,
} from './rows'

/** Portfolio item with tags loaded from portfolio_item_tags (join or nested query). */
export type PortfolioItemWithTags = PortfolioItemRow & {
  tags: string[]
}

/** Explore / feed: professional header + items (custom query shape). */
export type ProfessionalWithPortfolioItems = ProfessionalRow & {
  portfolio_items: PortfolioItemRow[]
}

/** Single pro detail with items + optional tags per item. */
export type ProfessionalWithTaggedItems = ProfessionalRow & {
  portfolio_items: PortfolioItemWithTags[]
}

/** Match request with server result when `match_results.status = 'ready'`. */
export type MatchRequestWithResult = MatchRequestRow & {
  /** When querying with nested `match_result_rows`, populate `ranking_rows`. */
  match_result: (MatchResultRow & { ranking_rows?: MatchResultRankingRow[] }) | null
}

/**
 * Rules-based MVP component weights (0–100 scale per component before sum; stored in
 * match_result_rows.component_scores). Extend keys as the ranker adds dimensions — no embeddings.
 */
export type MatchComponentScoresV1 = {
  category?: number
  location?: number
  tags?: number
  rating?: number
  budget?: number
  style_text?: number
  current_state?: number
  [key: string]: number | undefined
}

/**
 * Typed view of match_results.payload when status is ready (optional mirror of
 * match_result_rows for clients that read jsonb only).
 */
export type MatchRankingPayloadV1 = {
  version?: string
  ranked?: Json[]
  generated_at?: string
} & Record<string, Json | undefined>

export function isMatchResultReady(row: MatchResultRow): row is MatchResultRow & {
  status: 'ready'
  payload: Json
} {
  return row.status === 'ready' && row.payload != null
}

/** Contact request shown in pro inbox with optional denormalized client/pro labels from joins. */
export type ContactRequestForProInbox = ContactRequestRow & {
  client_display_name?: string | null
  portfolio_service_title?: string | null
}

/** Contact request in client “sent” list with pro display info from join. */
export type ContactRequestForClientList = ContactRequestRow & {
  professional_display_name?: string | null
  professional_city?: string | null
}
