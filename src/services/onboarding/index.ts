export type { Json } from './json'
export type {
  ClientProfileRow,
  ContactPreference,
  OnboardingExtra,
  OnboardingPayload,
  OnboardingState,
  UserPreferencesRow,
} from './types'
export type { OnboardingServiceResult } from './result'
export { authError, fail, ok, validationError } from './result'
export {
  deriveOnboardingState,
  mergeOnboardingExtra,
  parseOnboardingExtra,
  payloadToExtraPatch,
} from './extra'
export { onboardingInspirationMvpMode } from './inspirationMvp'
export { createOnboardingApi, type OnboardingApi } from './onboardingApi'
