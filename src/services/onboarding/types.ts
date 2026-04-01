import type { Json } from './json'

/** Matches onboarding UI: text | call | email */
export type ContactPreference = 'text' | 'call' | 'email'

/**
 * Keys stored in `user_preferences.extra` (snake_case) for onboarding.
 * Keep in sync with `supabase/migrations/20260330170000_trustfall_onboarding_mvp.sql` comments.
 */
export type OnboardingExtra = {
  style_tags?: string[]
  contact_preference?: ContactPreference
  /** MVP: optional label (often local filename); not a Storage path — see `inspirationMvp.ts`. */
  inspiration_file_name?: string | null
  /**
   * Email collected on the contact step before Auth has an email (e.g. anonymous session).
   * Keeps the wizard draft in sync after save; superseded by `auth.users.email` when linked.
   */
  contact_email?: string
}

/** Client payload — camelCase aligned with existing onboarding screens. */
export type OnboardingPayload = {
  firstName?: string
  categories?: string[]
  styleTags?: string[]
  /** MVP metadata only — maps to `extra.inspiration_file_name`; no upload in onboarding. */
  inspirationFileName?: string | null
  location?: string
  contactPreference?: ContactPreference | null
  /** Maps to `profiles.phone`. */
  phone?: string
  /** For validation only; stored on `auth.users` via credentials step. */
  email?: string
}

/** Row shape for `public.profiles` (fields used by onboarding). */
export type ClientProfileRow = {
  id: string
  display_name: string | null
  phone: string | null
  city: string | null
  budget_min: string | null
  budget_max: string | null
  avatar_url: string | null
  account_type: string
  created_at: string
  updated_at: string
}

/** Row shape for `public.user_preferences`. */
export type UserPreferencesRow = {
  user_id: string
  onboarding_completed_at: string | null
  preferred_categories: string[]
  extra: Json
  created_at: string
  updated_at: string
}

/**
 * Composite read model for gating and form hydration.
 * String fields default to '' / null so callers can bind inputs without null checks.
 */
export type OnboardingState = {
  profile: ClientProfileRow | null
  preferences: UserPreferencesRow | null
  firstName: string
  categories: string[]
  styleTags: string[]
  inspirationFileName: string
  location: string
  contactPreference: ContactPreference | null
  /** Supabase Auth email when set; otherwise `extra.contact_email` from the contact step. */
  email: string
  /** From `profiles.phone`. */
  phone: string
  /** True when `user_preferences.onboarding_completed_at` is set. */
  isComplete: boolean
}
