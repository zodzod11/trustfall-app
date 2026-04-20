/**
 * Insert payloads for Supabase `.insert()` — omit DB defaults where optional.
 * REGENERATION: prefer `Database['public']['Tables'][name]['Insert']` from codegen.
 */

import type { Json } from './json'
import type {
  AccountType,
  ContactRequestStatus,
  MatchRequestStatus,
  MatchResultStatus,
} from './enums'

export type ProfileInsert = {
  id: string
  display_name?: string | null
  phone?: string | null
  city?: string | null
  budget_min?: string | null
  budget_max?: string | null
  avatar_url?: string | null
  account_type?: AccountType
}

export type ProfessionalInsert = {
  id?: string
  slug: string
  display_name: string
  title: string
  category: string
  city: string
  rating?: string | null
  review_count?: number
  request_count?: number
  years_experience?: number | null
  about?: string | null
  booking_phone?: string | null
  booking_email?: string | null
  published?: boolean
  owner_user_id?: string | null
}

export type PortfolioItemInsert = {
  id?: string
  professional_id: string
  service_title: string
  category: string
  service_type?: string | null
  price?: string | null
  duration_minutes?: number | null
  before_image_path?: string | null
  after_image_path?: string | null
  sort_order?: number
  published?: boolean
  description?: string | null
}

export type PortfolioItemTagInsert = {
  portfolio_item_id: string
  tag: string
}

export type UserPreferencesInsert = {
  user_id: string
  onboarding_completed_at?: string | null
  preferred_categories?: string[]
  extra?: Json
}

export type MatchRequestInsert = {
  id?: string
  user_id: string
  status?: MatchRequestStatus
  category?: string | null
  location_text?: string | null
  tags?: string[]
  vision_notes?: string | null
  desired_style_text?: string | null
  current_state_text?: string | null
  budget_min?: string | null
  budget_max?: string | null
  inspiration_image_path?: string | null
  current_photo_path?: string | null
  saved_look_portfolio_item_id?: string | null
  submitted_at?: string | null
}

export type MatchResultInsert = {
  id?: string
  match_request_id: string
  status?: MatchResultStatus
  ranker_version?: string
  error_message?: string | null
  generated_at?: string | null
  payload?: Json | null
}

/** Service role / Edge: bulk insert ranked rows after rules-based scoring. */
export type MatchResultRankingInsert = {
  id?: string
  match_result_id: string
  rank: number
  professional_id: string
  portfolio_item_id: string
  total_score: string | number
  component_scores?: Json
  reasons?: string[]
}

export type SavedPortfolioInsert = {
  user_id: string
  portfolio_item_id: string
  saved_at?: string
}

export type SavedProfessionalInsert = {
  user_id: string
  professional_id: string
  saved_at?: string
}

export type ContactRequestInsert = {
  id?: string
  user_id: string
  professional_id?: string | null
  portfolio_item_id?: string | null
  match_request_id?: string | null
  request_type?: 'direct' | 'match'
  message: string
  preferred_date_text?: string | null
  client_name?: string | null
  client_email?: string | null
  client_phone?: string | null
  provider_name_snapshot?: string | null
  portfolio_title_snapshot?: string | null
  category_snapshot?: string | null
  portfolio_image_url_snapshot?: string | null
  pro_look_snapshot_path?: string | null
  inspiration_image_path?: string | null
  current_photo_path?: string | null
  status?: ContactRequestStatus
  provider_notified_at?: string | null
  notified_channels?: string[]
  notification_error?: string | null
}
