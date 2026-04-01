import {
  isNeedsEmailAuthSessionError,
  SESSION_ERROR_NEEDS_EMAIL_AUTH,
} from '../lib/auth/sessionErrors'

export { SESSION_ERROR_NEEDS_EMAIL_AUTH, isNeedsEmailAuthSessionError }

/**
 * User-facing copy for onboarding hydration / session errors (shared web + mobile).
 */
export function getSessionIssueHelp(rawMessage: string): {
  lines: string[]
  suggestSignIn: boolean
  suggestEmailSignUp: boolean
} {
  if (isNeedsEmailAuthSessionError(rawMessage)) {
    return {
      lines: [
        'Guest sign-in is turned off for this project.',
        'You will be redirected to create an account with email and password, then you can continue onboarding.',
      ],
      suggestSignIn: true,
      suggestEmailSignUp: true,
    }
  }
  const m = (rawMessage || '').toLowerCase()
  if (m.includes('anonymous')) {
    return {
      lines: [
        'Guest (anonymous) sign-in is disabled for this Supabase project.',
        'You can enable Anonymous under Supabase → Authentication → Providers, or create an account with email below.',
      ],
      suggestSignIn: true,
      suggestEmailSignUp: true,
    }
  }
  if (m.includes('not authenticated') || m.includes('jwt') || m.includes('session')) {
    return {
      lines: [
        'There is no active session, so your saved profile could not be loaded.',
        'Go back to the start screen: use Create account for onboarding, or Sign in if you already registered.',
      ],
      suggestSignIn: true,
      suggestEmailSignUp: false,
    }
  }
  return {
    lines: rawMessage
      ? [rawMessage]
      : ['Something went wrong while loading your profile. You can keep editing; sync will work once sign-in succeeds.'],
    suggestSignIn: false,
    suggestEmailSignUp: false,
  }
}
