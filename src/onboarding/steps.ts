/**
 * Canonical step order — keep in sync with web `OnboardingPage` and `mobile/app/onboarding.tsx`.
 * Index 0..6 maps to: Welcome → Category → Style → Location → Contact → Password → Complete.
 */
export const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', fieldKeys: ['firstName'] as const },
  { id: 'category', title: 'Category', fieldKeys: ['categories'] as const },
  { id: 'style', title: 'Style & inspiration', fieldKeys: ['styleTags', 'inspirationFileName'] as const },
  { id: 'location', title: 'Location', fieldKeys: ['location'] as const },
  {
    id: 'contact',
    title: 'Contact',
    fieldKeys: ['contactPreference', 'email', 'phone'] as const,
  },
  { id: 'password', title: 'Password', fieldKeys: ['password'] as const },
  { id: 'complete', title: 'Complete', fieldKeys: [] as const },
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id']

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length

export const LAST_STEP_INDEX = ONBOARDING_STEP_COUNT - 1

/** Content steps only (excludes the final “Complete” screen). */
export const LAST_CONTENT_STEP_INDEX = LAST_STEP_INDEX - 1

export function stepTitleAt(index: number): string {
  const step = ONBOARDING_STEPS[index]
  return step?.title ?? ''
}

export function clampStepIndex(index: number): number {
  return Math.max(0, Math.min(LAST_STEP_INDEX, index))
}
