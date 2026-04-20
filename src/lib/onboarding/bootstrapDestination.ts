import type { OnboardingApi } from '../../services/onboarding'
import type { OnboardingServiceResult } from '../../services/onboarding/result'
import type { OnboardingState } from '../../services/onboarding/types'

export type OnboardingDestination = 'explore' | 'onboarding' | 'verification-error'

/**
 * Where to send the user after `ensureAuthSession()` — **backend `onboarding_completed_at` is source of truth**.
 * On fetch error, keep the user in a retryable verification state instead of misrouting them.
 */
export function getDestinationFromOnboardingResult(
  res: OnboardingServiceResult<OnboardingState>,
): OnboardingDestination {
  if (res.error || res.data == null) return 'verification-error'
  return res.data.isComplete ? 'explore' : 'onboarding'
}

export async function getOnboardingDestinationFromApi(
  api: Pick<OnboardingApi, 'getOnboardingState'>,
): Promise<OnboardingDestination> {
  const res = await api.getOnboardingState()
  return getDestinationFromOnboardingResult(res)
}
