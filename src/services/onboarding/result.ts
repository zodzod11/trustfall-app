import type { PostgrestError } from '@supabase/supabase-js'

/** Same shape as mobile `UserServiceResult` — discriminated union for Supabase calls. */
export type OnboardingServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: PostgrestError }

export function ok<T>(data: T): OnboardingServiceResult<T> {
  return { data, error: null }
}

export function fail<T = never>(error: PostgrestError): OnboardingServiceResult<T> {
  return { data: null, error }
}

export function authError(message: string): PostgrestError {
  return {
    name: 'PostgrestError',
    message,
    details: '',
    hint: '',
    code: '42501',
  } as PostgrestError
}

export function validationError(message: string): PostgrestError {
  return {
    name: 'PostgrestError',
    message,
    details: '',
    hint: '',
    code: 'TRUSTFALL_VALIDATION',
  } as PostgrestError
}
