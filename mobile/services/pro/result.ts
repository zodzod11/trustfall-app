import type { PostgrestError } from '@supabase/supabase-js'

/** Standard return shape for Supabase-backed services (no exceptions for expected DB errors). */
export type ProServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: PostgrestError }

export function ok<T>(data: T): ProServiceResult<T> {
  return { data, error: null }
}

export function fail<T = never>(error: PostgrestError): ProServiceResult<T> {
  return { data: null, error }
}

/** Map auth/session failures to a Postgrest-shaped error for a uniform `ProServiceResult`. */
export function authPostgrestError(message: string): PostgrestError {
  return {
    name: 'PostgrestError',
    message,
    details: '',
    hint: '',
    code: '42501',
  } as PostgrestError
}
