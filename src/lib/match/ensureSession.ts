import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ensureSupabaseAuthSession,
  type EnsureAuthSessionResult,
} from '../auth/ensureSupabaseSession'
import { createClient } from '../client'

export type { EnsureAuthSessionResult }

/**
 * Ensures a Supabase Auth session for match_request persistence.
 * Uses anonymous sign-in when no session exists (enable in Supabase Auth settings).
 *
 * Pass the same `SupabaseClient` you use for data (e.g. onboarding) so session state is guaranteed in sync.
 */
export async function ensureAuthSession(
  client?: SupabaseClient,
): Promise<EnsureAuthSessionResult> {
  return ensureSupabaseAuthSession(client ?? createClient())
}
