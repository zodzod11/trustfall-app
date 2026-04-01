import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import type { OnboardingApi } from '../services/onboarding'
import { draftToOnboardingPayload } from './payload'
import { getInitialOnboardingFlowModel, onboardingFlowReducer, selectShouldSkipOnboarding } from './reducer'
import type { OnboardingFormValues } from './types'
import { canProceedFromStep, validateForComplete } from './validation'

export type SaveOrCompleteResult = { ok: true } | { ok: false; message: string }

export type OnboardingFlowOptions = {
  /** Run before loading server state (e.g. `ensureAuthSession` so anonymous users exist in Supabase). */
  prepareHydration?: () => Promise<void>
}

/**
 * Wires the onboarding flow reducer to `OnboardingApi`: hydrate on mount, partial save, complete.
 * Pass the same client-bound API as elsewhere (`createOnboardingApi(client)` / mobile `onboardingApi`).
 */
export function useOnboardingFlow(api: OnboardingApi, options?: OnboardingFlowOptions) {
  const [model, dispatch] = useReducer(onboardingFlowReducer, undefined, getInitialOnboardingFlowModel)
  const modelRef = useRef(model)
  const apiRef = useRef(api)
  const prepareRef = useRef(options?.prepareHydration)

  useLayoutEffect(() => {
    modelRef.current = model
  }, [model])
  useLayoutEffect(() => {
    apiRef.current = api
  }, [api])
  useLayoutEffect(() => {
    prepareRef.current = options?.prepareHydration
  }, [options?.prepareHydration])

  useEffect(() => {
    let cancelled = false
    dispatch({ type: 'hydration/start' })
    void (async () => {
      try {
        await prepareRef.current?.()
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not start session'
        if (!cancelled) {
          dispatch({ type: 'hydration/error', message })
        }
        return
      }
      if (cancelled) return
      const res = await apiRef.current.getOnboardingState()
      if (cancelled) return
      if (res.error) {
        dispatch({ type: 'hydration/error', message: res.error.message })
        return
      }
      dispatch({ type: 'hydration/success', server: res.data })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const patchDraft = useCallback((patch: Partial<OnboardingFormValues>) => {
    dispatch({ type: 'draft/patch', patch })
  }, [])

  const replaceDraft = useCallback((draft: OnboardingFormValues) => {
    dispatch({ type: 'draft/replace', draft })
  }, [])

  const goToStep = useCallback((index: number) => {
    dispatch({ type: 'step/set', index })
  }, [])

  const goNext = useCallback(() => {
    dispatch({ type: 'step/next' })
  }, [])

  const goBack = useCallback(() => {
    dispatch({ type: 'step/prev' })
  }, [])

  /** Partial persist — does not mark onboarding complete. */
  const saveProgress = useCallback(async (): Promise<SaveOrCompleteResult> => {
    dispatch({ type: 'persist/start' })
    const draft = modelRef.current.draft
    const res = await apiRef.current.saveOnboardingProgress(draftToOnboardingPayload(draft))
    if (res.error) {
      dispatch({ type: 'persist/error', message: res.error.message })
      return { ok: false, message: res.error.message }
    }
    dispatch({ type: 'persist/success', server: res.data })
    return { ok: true }
  }, [])

  /**
   * Validates the current step, saves partial progress, then advances.
   * Recommended for primary “Continue” so Supabase stays in sync at each step.
   */
  const persistStepAndContinue = useCallback(async (): Promise<SaveOrCompleteResult> => {
    const { stepIndex, draft } = modelRef.current
    if (!canProceedFromStep(stepIndex, draft)) {
      return { ok: false, message: 'Complete this step before continuing' }
    }
    const save = await saveProgress()
    if (!save.ok) return save
    dispatch({ type: 'step/next' })
    return { ok: true }
  }, [saveProgress])

  /** Final submit — validates full wizard, sets `onboarding_completed_at`. */
  const complete = useCallback(async (): Promise<SaveOrCompleteResult> => {
    const draft = modelRef.current.draft
    const v = validateForComplete(draft)
    if (!v.ok) {
      return { ok: false, message: v.message }
    }
    dispatch({ type: 'persist/start' })
    const res = await apiRef.current.completeOnboarding(draftToOnboardingPayload(draft))
    if (res.error) {
      dispatch({ type: 'persist/error', message: res.error.message })
      return { ok: false, message: res.error.message }
    }
    dispatch({ type: 'persist/success', server: res.data })
    return { ok: true }
  }, [])

  const clearPersistError = useCallback(() => {
    dispatch({ type: 'persist/clearError' })
  }, [])

  const shouldSkip = selectShouldSkipOnboarding(model.server)

  return {
    model,
    /** True when server reports `onboarding_completed_at` — route to app shell. */
    shouldSkip,
    patchDraft,
    replaceDraft,
    goToStep,
    goNext,
    goBack,
    saveProgress,
    persistStepAndContinue,
    complete,
    clearPersistError,
  }
}
