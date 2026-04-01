import type { AuthError, SupabaseClient } from '@supabase/supabase-js'

const MIN_PASSWORD = 8

function mapAuthError(error: AuthError): string {
  const msg = (error.message || '').toLowerCase()
  if (msg.includes('already been registered') || msg.includes('user already registered')) {
    return 'That email is already registered. Use Sign in with this email, or choose a different one.'
  }
  if (msg.includes('same as the old password')) {
    return 'Choose a new password you have not used before on this account.'
  }
  return error.message
}

/**
 * Registers email + password for onboarding.
 *
 * - **Anonymous session** (normal “Create account” path): uses `updateUser` so the same user id keeps
 *   all profile rows saved during the wizard — this is Supabase’s supported “upgrade anonymous user” flow.
 * - **Already signed in with email**: if the email matches, only updates password when needed; otherwise
 *   returns a clear error.
 * - **No session**: cannot attach wizard data; user must restart from the welcome screen.
 */
export async function applyOnboardingCredentials(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const e = email.trim()
  if (!e) return { error: 'Email is required' }
  if (password.length < MIN_PASSWORD) {
    return { error: `Password must be at least ${MIN_PASSWORD} characters` }
  }

  const {
    data: { user },
    error: userErr,
  } = await client.auth.getUser()
  if (userErr) return { error: userErr.message }

  if (!user) {
    return {
      error:
        'Your session expired before account creation. Go back to the start screen and tap Create account again.',
    }
  }

  if (user.is_anonymous) {
    const { error } = await client.auth.updateUser({ email: e, password })
    if (error) return { error: mapAuthError(error) }
    const { error: refreshErr } = await client.auth.refreshSession()
    if (refreshErr) return { error: refreshErr.message }
    return { error: null }
  }

  const existing = user.email?.trim().toLowerCase()
  if (existing && existing !== e.toLowerCase()) {
    return {
      error:
        'This device is signed in with a different email. Sign out and use Sign in or Create account.',
    }
  }

  const { error } = await client.auth.updateUser({ email: e, password })
  if (error) return { error: mapAuthError(error) }
  const { error: refreshErr } = await client.auth.refreshSession()
  if (refreshErr) return { error: refreshErr.message }
  return { error: null }
}
