import type { ContactPreference, OnboardingState as ServerOnboardingState } from '../services/onboarding/types'
import type { ServiceCategory } from '../types'

/**
 * Local draft — what the user edits step-by-step. Not necessarily persisted yet.
 * Mirrors web/mobile onboarding screens; categories stay typed as catalog values.
 */
export type OnboardingFormValues = {
  firstName: string
  categories: ServiceCategory[]
  styleTags: string[]
  /** MVP: optional text label from picker filename — persisted in `extra`, not uploaded. */
  inspirationFileName: string
  location: string
  contactPreference: ContactPreference | null
  /** Set on auth.users via password step (not stored in profiles). */
  email: string
  /** Saved to `profiles.phone`. */
  phone: string
  /** Local only until credentials step; never sent as a DB field. */
  password: string
}

export function emptyOnboardingDraft(): OnboardingFormValues {
  return {
    firstName: '',
    categories: [],
    styleTags: [],
    inspirationFileName: '',
    location: '',
    contactPreference: null,
    email: '',
    phone: '',
    password: '',
  }
}

/** Last successful read from Supabase (`getOnboardingState`). */
export type PersistedOnboardingSnapshot = ServerOnboardingState

export type HydrationPhase = 'idle' | 'loading' | 'ready' | 'error'

export type PersistPhase = 'idle' | 'saving' | 'saved' | 'error'

/**
 * UI + navigation state for the multi-step flow.
 * - `draft` — ephemeral form state (may be ahead of or diverge from `server`).
 * - `server` — last loaded backend snapshot; `null` before first successful fetch or if unauthenticated.
 */
export type OnboardingFlowModel = {
  stepIndex: number
  draft: OnboardingFormValues
  server: PersistedOnboardingSnapshot | null
  hydration: { phase: HydrationPhase; message?: string }
  persist: { phase: PersistPhase; message?: string; savedAt?: number }
  /** True after local edits since last successful hydrate or save. */
  isDirty: boolean
}

export type OnboardingFlowAction =
  | { type: 'hydration/start' }
  | { type: 'hydration/success'; server: PersistedOnboardingSnapshot }
  | { type: 'hydration/error'; message: string }
  | { type: 'draft/patch'; patch: Partial<OnboardingFormValues> }
  | { type: 'draft/replace'; draft: OnboardingFormValues }
  | { type: 'step/set'; index: number }
  | { type: 'step/next' }
  | { type: 'step/prev' }
  | { type: 'persist/start' }
  | { type: 'persist/success'; server: PersistedOnboardingSnapshot }
  | { type: 'persist/error'; message: string }
  | { type: 'persist/clearError' }
  | { type: 'markClean' }
