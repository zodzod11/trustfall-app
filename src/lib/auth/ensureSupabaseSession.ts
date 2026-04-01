import type { SupabaseClient } from '@supabase/supabase-js'
import { isAnonymousSignInDisabledError } from './sessionErrors'

export type EnsureAuthSessionResult = {
  userId: string | null
  error: string | null
  /**
   * True when `signInAnonymously()` failed because Anonymous is disabled and there was no session.
   * Callers should send the user to email sign-up or sign-in instead of onboarding-as-guest.
   */
  needsEmailAuthFallback: boolean
}

/**
 * Ensures a Supabase Auth session (anonymous when none exists).
 * Shared by web and mobile — pass the same client used for data calls.
 */
export async function ensureSupabaseAuthSession(
  client: SupabaseClient,
): Promise<EnsureAuthSessionResult> {
  const {
    data: { session },
    error: sessionErr,
  } = await client.auth.getSession()
  if (sessionErr) {
    return { userId: null, error: sessionErr.message, needsEmailAuthFallback: false }
  }
  if (session?.user) {
    return { userId: session.user.id, error: null, needsEmailAuthFallback: false }
  }

  const { data, error } = await client.auth.signInAnonymously()
  if (error) {
    const needsEmailAuthFallback = isAnonymousSignInDisabledError(error)
    return {
      userId: null,
      error:
        error.message ||
        'Sign in required. Enable anonymous sign-in in Supabase or sign in manually.',
      needsEmailAuthFallback,
    }
  }
  return { userId: data.user?.id ?? null, error: null, needsEmailAuthFallback: false }
}
