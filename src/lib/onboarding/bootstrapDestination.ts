import type { OnboardingApi } from '../../services/onboarding'
import type { OnboardingServiceResult } from '../../services/onboarding/result'
import type { OnboardingState } from '../../services/onboarding/types'

/**
 * Where to send the user after `ensureAuthSession()` — **backend `onboarding_completed_at` is source of truth**.
 * On fetch error, prefer onboarding so the user can finish or retry saves.
 */
export function getDestinationFromOnboardingResult(
  res: OnboardingServiceResult<OnboardingState>,
): 'explore' | 'onboarding' {
  if (res.error || res.data == null) return 'onboarding'
  return res.data.isComplete ? 'explore' : 'onboarding'
}

export async function getOnboardingDestinationFromApi(
  api: Pick<OnboardingApi, 'getOnboardingState'>,
): Promise<'explore' | 'onboarding'> {
  const res = await api.getOnboardingState()
  return getDestinationFromOnboardingResult(res)
}
