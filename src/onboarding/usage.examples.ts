/**
 * Example wiring (not executed by the app).
 *
 * Web:
 *   import { createClient } from '@/lib/client'
 *   import { createOnboardingApi } from '@/services/onboarding'
 *   import { useOnboardingFlow } from '@/onboarding'
 *   const api = createOnboardingApi(createClient())
 *   const flow = useOnboardingFlow(api)
 *
 * Mobile:
 *   import { onboardingApi } from '@/lib/onboarding'
 *   import { useOnboardingFlow } from '../../src/onboarding'
 *   const flow = useOnboardingFlow(onboardingApi)
 */

import type { OnboardingApi } from '../services/onboarding'
import { useOnboardingFlow } from './useOnboardingFlow'

/** Illustrative — call from a component that already has `api`. */
export function useExampleOnboardingScreen(api: OnboardingApi) {
  const flow = useOnboardingFlow(api)

  if (flow.shouldSkip) {
    // router.replace('/explore') or similar
  }

  if (flow.model.hydration.phase === 'loading') {
    // skeleton
  }

  const { stepIndex, draft } = flow.model
  void stepIndex
  void draft

  return flow
}
