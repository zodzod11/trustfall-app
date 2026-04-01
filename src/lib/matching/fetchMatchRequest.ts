import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchRequestRecord } from './types'

export async function fetchMatchRequest(
  supabase: SupabaseClient,
  matchRequestId: string,
): Promise<{ row: MatchRequestRecord | null; error: string | null }> {
  const { data, error } = await supabase
    .from('match_requests')
    .select('*')
    .eq('id', matchRequestId)
    .maybeSingle()

  if (error) {
    return { row: null, error: error.message }
  }
  if (!data) {
    return { row: null, error: null }
  }
  return { row: data as MatchRequestRecord, error: null }
}
