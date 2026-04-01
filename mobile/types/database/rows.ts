/**
 * Raw database row shapes — snake_case column names as returned by PostgREST / Supabase.
 *
 * REGENERATION: After `supabase gen types typescript`, replace imports in `index.ts` with
 * `Database['public']['Tables']['<table>']['Row']` from generated file, or delete this file
 * and point consumers at generated types only. See `README.md` in this folder.
 */

import type { Json } from './json'
import type {
  AccountType,
  ContactRequestStatus,
  MatchRequestStatus,
  MatchResultStatus,
} from './enums'

/** public.profiles */
export type ProfileRow = {
  id: string
  display_name: string | null
  phone: string | null
  city: string | null
  budget_min: string | null
  budget_max: string | null
  avatar_url: string | null
  account_type: AccountType
  created_at: string
  updated_at: string
}

/**
 * public.professionals
 * owner_user_id added in 20260330140000_trustfall_rls_policies.sql
 */
export type ProfessionalRow = {
  id: string
  slug: string
  display_name: string
  title: string
  category: string
  city: string
  rating: string | null
  review_count: number
  years_experience: number | null
  about: string | null
  booking_phone: string | null
  booking_email: string | null
  published: boolean
  owner_user_id: string | null
  created_at: string
  updated_at: string
}

/** public.portfolio_items — image paths are keys inside Storage bucket `portfolio` */
export type PortfolioItemRow = {
  id: string
  professional_id: string
  service_title: string
  category: string
  price: string | null
  before_image_path: string | null
  after_image_path: string | null
  sort_order: number
  published: boolean
  created_at: string
  updated_at: string
}

/** public.portfolio_item_tags — composite natural key */
export type PortfolioItemTagRow = {
  portfolio_item_id: string
  tag: string
}

/** public.user_preferences */
export type UserPreferencesRow = {
  user_id: string
  onboarding_completed_at: string | null
  preferred_categories: string[]
  extra: Json
  created_at: string
  updated_at: string
}

/** public.match_requests */
export type MatchRequestRow = {
  id: string
  user_id: string
  status: MatchRequestStatus
  category: string | null
  location_text: string | null
  tags: string[]
  /** Legacy combined notes; prefer desired_style_text + current_state_text. */
  vision_notes: string | null
  desired_style_text: string | null
  current_state_text: string | null
  budget_min: string | null
  budget_max: string | null
  /** Reference inspiration: Storage key or HTTPS URL. */
  inspiration_image_path: string | null
  /** Current look: Storage key or HTTPS URL. */
  current_photo_path: string | null
  saved_look_portfolio_item_id: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

/** public.match_results — summary row + optional jsonb payload mirror */
export type MatchResultRow = {
  id: string
  match_request_id: string
  status: MatchResultStatus
  ranker_version: string
  error_message: string | null
  generated_at: string | null
  payload: Json | null
  created_at: string
  updated_at: string
}

/** public.match_result_rows — one ranked portfolio hit per parent match_results job */
export type MatchResultRankingRow = {
  id: string
  match_result_id: string
  rank: number
  professional_id: string
  portfolio_item_id: string
  total_score: string
  component_scores: Json
  reasons: string[]
  created_at: string
}

/** public.saved_portfolios — composite PK */
export type SavedPortfolioRow = {
  user_id: string
  portfolio_item_id: string
  saved_at: string
}

/** public.contact_requests */
export type ContactRequestRow = {
  id: string
  user_id: string
  professional_id: string
  portfolio_item_id: string
  message: string
  preferred_date_text: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  pro_look_snapshot_path: string | null
  inspiration_image_path: string | null
  current_photo_path: string | null
  status: ContactRequestStatus
  created_at: string
  updated_at: string
}
