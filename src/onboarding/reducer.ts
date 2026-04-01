import { clampStepIndex } from './steps'
import { buildDraftFromServer } from './hydrate'
import type { OnboardingFlowAction, OnboardingFlowModel } from './types'
import { emptyOnboardingDraft } from './types'
import { computeResumeStepIndex } from './validation'

export function getInitialOnboardingFlowModel(): OnboardingFlowModel {
  return {
    stepIndex: 0,
    draft: emptyOnboardingDraft(),
    server: null,
    hydration: { phase: 'idle' },
    persist: { phase: 'idle' },
    isDirty: false,
  }
}

export function onboardingFlowReducer(
  state: OnboardingFlowModel,
  action: OnboardingFlowAction,
): OnboardingFlowModel {
  switch (action.type) {
    case 'hydration/start':
      return {
        ...state,
        hydration: { phase: 'loading' },
      }

    case 'hydration/success': {
      const draft = buildDraftFromServer(action.server)
      const stepIndex = computeResumeStepIndex(draft)
      return {
        ...state,
        server: action.server,
        draft,
        stepIndex: clampStepIndex(stepIndex),
        hydration: { phase: 'ready' },
        isDirty: false,
        persist: { phase: 'idle' },
      }
    }

    case 'hydration/error':
      return {
        ...state,
        hydration: { phase: 'error', message: action.message },
      }

    case 'draft/patch':
      return {
        ...state,
        draft: { ...state.draft, ...action.patch },
        isDirty: true,
      }

    case 'draft/replace':
      return {
        ...state,
        draft: action.draft,
        isDirty: true,
      }

    case 'step/set':
      return {
        ...state,
        stepIndex: clampStepIndex(action.index),
      }

    case 'step/next':
      return {
        ...state,
        stepIndex: clampStepIndex(state.stepIndex + 1),
      }

    case 'step/prev':
      return {
        ...state,
        stepIndex: clampStepIndex(state.stepIndex - 1),
      }

    case 'persist/start':
      return {
        ...state,
        persist: { phase: 'saving' },
      }

    case 'persist/success':
      return {
        ...state,
        server: action.server,
        draft: buildDraftFromServer(action.server),
        isDirty: false,
        persist: { phase: 'saved', savedAt: Date.now() },
      }

    case 'persist/error':
      return {
        ...state,
        persist: { phase: 'error', message: action.message },
      }

    case 'persist/clearError':
      return {
        ...state,
        persist: { phase: 'idle' },
      }

    case 'markClean':
      return { ...state, isDirty: false }

    default:
      return state
  }
}

/** Whether the app should skip the wizard (already completed on server). */
export function selectShouldSkipOnboarding(server: OnboardingFlowModel['server']): boolean {
  return Boolean(server?.isComplete)
}
