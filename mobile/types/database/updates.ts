/**
 * Partial update payloads for Supabase `.update()`.
 * REGENERATION: prefer `Database['public']['Tables'][name]['Update']` from codegen.
 */

import type { Json } from './json'
import type {
  AccountType,
  ContactRequestStatus,
  MatchRequestStatus,
  MatchResultStatus,
} from './enums'

export type ProfileUpdate = Partial<{
  display_name: string | null
  phone: string | null
  city: string | null
  budget_min: string | null
  budget_max: string | null
  avatar_url: string | null
  account_type: AccountType
}>

export type ProfessionalUpdate = Partial<{
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
}>

export type PortfolioItemUpdate = Partial<{
  service_title: string
  category: string
  price: string | null
  before_image_path: string | null
  after_image_path: string | null
  sort_order: number
  published: boolean
}>

export type UserPreferencesUpdate = Partial<{
  onboarding_completed_at: string | null
  preferred_categories: string[]
  extra: Json
}>

export type MatchRequestUpdate = Partial<{
  status: MatchRequestStatus
  category: string | null
  location_text: string | null
  tags: string[]
  vision_notes: string | null
  desired_style_text: string | null
  current_state_text: string | null
  budget_min: string | null
  budget_max: string | null
  inspiration_image_path: string | null
  current_photo_path: string | null
  saved_look_portfolio_item_id: string | null
  submitted_at: string | null
}>

export type MatchResultUpdate = Partial<{
  status: MatchResultStatus
  ranker_version: string
  error_message: string | null
  generated_at: string | null
  payload: Json | null
}>

export type ContactRequestUpdate = Partial<{
  message: string
  preferred_date_text: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  pro_look_snapshot_path: string | null
  inspiration_image_path: string | null
  current_photo_path: string | null
  status: ContactRequestStatus
}>
