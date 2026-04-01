import type { OnboardingFormValues } from './types'
import { LAST_CONTENT_STEP_INDEX, LAST_STEP_INDEX } from './steps'

const MIN_PASSWORD = 8

function isValidEmail(s: string): boolean {
  const t = s.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

function isValidPhone(s: string): boolean {
  const digits = s.replace(/\D/g, '')
  return digits.length >= 10
}

/**
 * Per-step gating — can the user leave this step via “Continue”?
 * Matches existing web/mobile `canContinue` switch logic.
 */
export function canProceedFromStep(stepIndex: number, draft: OnboardingFormValues): boolean {
  switch (stepIndex) {
    case 0:
      return draft.firstName.trim().length > 0
    case 1:
      return draft.categories.length > 0
    case 2:
      return draft.styleTags.length > 0 || draft.inspirationFileName.trim().length > 0
    case 3:
      return draft.location.trim().length > 0
    case 4:
      return (
        draft.contactPreference !== null &&
        isValidEmail(draft.email) &&
        isValidPhone(draft.phone)
      )
    case 5:
      return draft.password.length >= MIN_PASSWORD
    case LAST_STEP_INDEX:
      return true
    default:
      return false
  }
}

/**
 * Stricter rules for final submit — aligned with `completeOnboarding` in `onboardingApi.ts`.
 */
export function validateForComplete(draft: OnboardingFormValues): { ok: true } | { ok: false; message: string } {
  if (!draft.firstName.trim()) {
    return { ok: false, message: 'firstName is required to complete onboarding' }
  }
  if (draft.categories.length === 0) {
    return { ok: false, message: 'At least one category is required' }
  }
  if (!draft.location.trim()) {
    return { ok: false, message: 'location is required to complete onboarding' }
  }
  if (draft.contactPreference == null) {
    return { ok: false, message: 'contactPreference is required to complete onboarding' }
  }
  if (!isValidEmail(draft.email)) {
    return { ok: false, message: 'A valid email is required' }
  }
  if (!isValidPhone(draft.phone)) {
    return { ok: false, message: 'A valid phone number is required' }
  }
  const styleOk = draft.styleTags.length > 0
  const inspOk = draft.inspirationFileName.trim().length > 0
  if (!styleOk && !inspOk) {
    return {
      ok: false,
      message: 'Add at least one style tag or an inspiration reference (optional label)',
    }
  }
  return { ok: true }
}

/**
 * First step index where gating fails; if all content steps pass, returns the Complete step index.
 * Use after hydrating from Supabase to resume mid-flow.
 */
export function computeResumeStepIndex(draft: OnboardingFormValues): number {
  for (let i = 0; i <= LAST_CONTENT_STEP_INDEX; i++) {
    if (!canProceedFromStep(i, draft)) return i
  }
  return LAST_STEP_INDEX
}
