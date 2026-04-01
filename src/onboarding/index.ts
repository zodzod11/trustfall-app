/** Shared onboarding flow — use with `createOnboardingApi` / mobile `onboardingApi`. */

export { ONBOARDING_CATEGORY_OPTIONS, ONBOARDING_STYLE_TAG_OPTIONS } from './catalog'

export type {
  HydrationPhase,
  OnboardingFlowAction,
  OnboardingFlowModel,
  OnboardingFormValues,
  PersistedOnboardingSnapshot,
  PersistPhase,
} from './types'
export { emptyOnboardingDraft } from './types'

export {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_COUNT,
  LAST_STEP_INDEX,
  LAST_CONTENT_STEP_INDEX,
  type OnboardingStepId,
  clampStepIndex,
  stepTitleAt,
} from './steps'

export {
  canProceedFromStep,
  computeResumeStepIndex,
  validateForComplete,
} from './validation'

export { draftToOnboardingPayload } from './payload'

export {
  buildDraftFromServer,
  rowsToPersistedSnapshot,
  serverSnapshotToDraft,
} from './hydrate'

export {
  getInitialOnboardingFlowModel,
  onboardingFlowReducer,
  selectShouldSkipOnboarding,
} from './reducer'

export type { OnboardingFlowOptions, SaveOrCompleteResult } from './useOnboardingFlow'
export { useOnboardingFlow } from './useOnboardingFlow'

export {
  getSessionIssueHelp,
  isNeedsEmailAuthSessionError,
  SESSION_ERROR_NEEDS_EMAIL_AUTH,
} from './hydrationMessages'
