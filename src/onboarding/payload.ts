import type { OnboardingPayload } from '../services/onboarding/types'
import type { OnboardingFormValues } from './types'

/**
 * Maps local draft → API payload (all keys optional for partial save).
 * `inspirationFileName` is metadata only — see `services/onboarding/inspirationMvp.ts`.
 */
export function draftToOnboardingPayload(draft: OnboardingFormValues): OnboardingPayload {
  return {
    firstName: draft.firstName.trim() || undefined,
    categories: draft.categories.length ? [...draft.categories] : undefined,
    styleTags: draft.styleTags.length ? [...draft.styleTags] : undefined,
    inspirationFileName: draft.inspirationFileName.trim() || null,
    location: draft.location.trim() || undefined,
    contactPreference: draft.contactPreference,
    phone: draft.phone.trim() || undefined,
    email: draft.email.trim() || undefined,
  }
}
