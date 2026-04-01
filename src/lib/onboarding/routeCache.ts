/**
 * Optional UX hints only — **never** used as the sole source of truth for routing.
 * Write after a successful `getOnboardingState` if you want analytics or future optimistic UI;
 * any read must still be confirmed by the server before relying on it for access control.
 */

export const ONBOARDING_ROUTE_HINT_KEY = 'trustfall:onboarding:routeHint:v1'

export type OnboardingRouteHint = {
  /** Mirrors `user_preferences` completion at time of write */
  isComplete: boolean
  cachedAt: number
}

export function parseRouteHint(raw: string | null): OnboardingRouteHint | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Partial<OnboardingRouteHint>
    if (typeof o.isComplete !== 'boolean' || typeof o.cachedAt !== 'number') return null
    return { isComplete: o.isComplete, cachedAt: o.cachedAt }
  } catch {
    return null
  }
}

/** Web: best-effort hint for future sessions (not used for routing decisions here). */
export function writeWebRouteHint(isComplete: boolean): void {
  try {
    const payload: OnboardingRouteHint = { isComplete, cachedAt: Date.now() }
    localStorage.setItem(ONBOARDING_ROUTE_HINT_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}
