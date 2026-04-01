import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchResultRecord, MatchResultRowRecord } from './types'

const ROW_SELECT = `
  id,
  match_result_id,
  rank,
  professional_id,
  portfolio_item_id,
  total_score,
  component_scores,
  reasons,
  portfolio_items!inner (
    service_title,
    before_image_path,
    after_image_path,
    professionals!inner (
      display_name,
      title,
      city,
      rating,
      booking_phone,
      booking_email
    )
  )
`.trim()

export type MatchResultRowWithJoin = MatchResultRowRecord & {
  portfolio_items: {
    service_title: string
    before_image_path: string | null
    after_image_path: string | null
    professionals: {
      display_name: string
      title: string
      city: string
      rating: string | number | null
      booking_phone: string | null
      booking_email: string | null
    }
  }
}

export async function fetchMatchResultByRequestId(
  supabase: SupabaseClient,
  matchRequestId: string,
): Promise<{
  result: MatchResultRecord | null
  rows: MatchResultRowWithJoin[]
  error: string | null
}> {
  const { data: mr, error: mrErr } = await supabase
    .from('match_results')
    .select('id, match_request_id, status, ranker_version, error_message, generated_at, payload')
    .eq('match_request_id', matchRequestId)
    .maybeSingle()

  if (mrErr) {
    return { result: null, rows: [], error: mrErr.message }
  }
  if (!mr) {
    return { result: null, rows: [], error: null }
  }

  const result = mr as MatchResultRecord

  if (result.status !== 'ready') {
    return { result, rows: [], error: null }
  }

  const { data: rows, error: rowErr } = await supabase
    .from('match_result_rows')
    .select(ROW_SELECT)
    .eq('match_result_id', result.id)
    .order('rank', { ascending: true })

  if (rowErr) {
    return { result, rows: [], error: rowErr.message }
  }

  return {
    result,
    rows: (rows ?? []) as unknown as MatchResultRowWithJoin[],
    error: null,
  }
}
