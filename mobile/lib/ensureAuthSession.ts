import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ensureSupabaseAuthSession,
  type EnsureAuthSessionResult,
} from '../../src/lib/auth/ensureSupabaseSession'
import { supabase } from './supabase'

export type { EnsureAuthSessionResult }

/** Mobile: same anonymous-session bootstrap as web `ensureAuthSession`. */
export async function ensureAuthSession(
  client?: SupabaseClient,
): Promise<EnsureAuthSessionResult> {
  return ensureSupabaseAuthSession(client ?? supabase)
}
