import type { PostgrestError } from '@supabase/supabase-js'

export type { ProServiceResult as UserServiceResult } from '@/services/pro/result'

export { authPostgrestError, fail, ok } from '@/services/pro/result'

/** Client-side validation failure surfaced as a Postgrest-shaped error for uniform handling. */
export function validationError(message: string): PostgrestError {
  return {
    name: 'PostgrestError',
    message,
    details: '',
    hint: '',
    code: 'TRUSTFALL_VALIDATION',
  } as PostgrestError
}
