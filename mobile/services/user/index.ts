/**
 * User-side backend services (Supabase) — preferences, match requests, saves, contact requests.
 */

export type { UserServiceResult } from './result'
export { authPostgrestError, fail, ok, validationError } from './result'

export { saveUserPreferences } from './userPreferencesService'

export type { OnboardingApi } from '../../../src/services/onboarding'
export { createOnboardingApi } from '../../../src/services/onboarding'
export { onboardingApi } from '../../lib/onboarding'

export {
  createMatchRequest,
  listMyMatchRequests,
  updateMatchRequestImagePaths,
} from './matchRequestService'

export type { SavedPortfolioWithItem } from './savedPortfoliosService'
export {
  listMySavedPortfolios,
  removeSavedPortfolioItem,
  savePortfolioItem,
} from './savedPortfoliosService'

export { createContactRequest, updateContactRequestImagePaths } from './contactRequestService'
