/**
 * User-side domain inputs (client / match / saved / contact flows).
 * DB rows remain in `@/types/database`.
 */

import type { Json } from '@/types/database'

/** Persist onboarding + prefs; maps to `user_preferences`. */
export interface SaveUserPreferencesInput {
  onboarding_completed_at?: string | null
  preferred_categories?: string[]
  extra?: Json
}

/** Create a new match wizard row (draft by default). */
export interface CreateMatchRequestInput {
  /** Service type (maps to `category`). */
  category?: string | null
  location_text?: string | null
  tags?: string[]
  vision_notes?: string | null
  desired_style_text?: string | null
  current_state_text?: string | null
  /** Same scale as profiles; optional range for rules-based matching. */
  budget_min?: string | null
  budget_max?: string | null
  saved_look_portfolio_item_id?: string | null
  /** Reference inspiration — Storage keys or HTTPS URLs. */
  inspiration_image_path?: string | null
  /** Current look — Storage keys or HTTPS URLs. */
  current_photo_path?: string | null
}

/** Patch image path references on an existing match request (owned by user). */
export interface UpdateMatchRequestImagePathsInput {
  inspiration_image_path?: string | null
  current_photo_path?: string | null
}

/** Optional filters when listing prior match requests. */
export interface ListMatchRequestsQuery {
  limit?: number
  offset?: number
  /** Filter by status; omit for all. */
  status?: 'draft' | 'submitted' | 'cancelled'
}

/** Insert into `contact_requests` (message to a pro for a look). */
export interface CreateContactRequestInput {
  professional_id: string
  portfolio_item_id: string
  message: string
  preferred_date_text?: string | null
  client_name?: string | null
  client_email?: string | null
  client_phone?: string | null
  pro_look_snapshot_path?: string | null
  inspiration_image_path?: string | null
  current_photo_path?: string | null
}
