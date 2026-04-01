/** Thrown into onboarding hydration when anonymous sign-in is unavailable and no session exists. */
export const SESSION_ERROR_NEEDS_EMAIL_AUTH = 'TRUSTFALL_NEEDS_EMAIL_AUTH'

export function isNeedsEmailAuthSessionError(message: string | undefined): boolean {
  return message === SESSION_ERROR_NEEDS_EMAIL_AUTH
}

/** Detect Supabase / GoTrue errors when the Anonymous provider is off. Wording varies by version. */
export function isAnonymousSignInDisabledError(error: { message: string }): boolean {
  const m = (error.message || '').toLowerCase()
  if (!m) return false
  if (m.includes('anonymous') && (m.includes('disabled') || m.includes('not enabled'))) return true
  if (m.includes('anonymous provider')) return true
  if (m.includes('anonymous sign')) return true
  if (m.includes('enable anonymous')) return true
  return false
}
