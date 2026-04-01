import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json, MatchResultsPayloadV1, ScoredPortfolioItem } from './types'
import { RANKER_VERSION } from './weights'

/** Marks a match job as running before scores are written (service role / Edge). */
export async function upsertMatchResultPending(
  supabase: SupabaseClient,
  matchRequestId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('match_results').upsert(
    {
      match_request_id: matchRequestId,
      status: 'pending',
      ranker_version: RANKER_VERSION,
      generated_at: null,
      error_message: null,
      payload: null,
    },
    { onConflict: 'match_request_id' },
  )
  return { error: error?.message ?? null }
}

function componentScoresJson(items: ScoredPortfolioItem['components']): Record<string, number> {
  return Object.fromEntries(items.map((c) => [c.key, c.points]))
}

export async function persistMatchResults(
  supabase: SupabaseClient,
  matchRequestId: string,
  top: ScoredPortfolioItem[],
  generatedAtIso: string,
): Promise<{ match_result_id: string | null; error: string | null }> {
  const payload: MatchResultsPayloadV1 = {
    version: 1,
    ranker_version: RANKER_VERSION,
    generated_at: generatedAtIso,
    match_request_id: matchRequestId,
    top: top.map((t, i) => ({
      rank: i + 1,
      portfolio_item_id: t.portfolio_item_id,
      professional_id: t.professional_id,
      total_score: t.total,
      component_scores: componentScoresJson(t.components),
      reasons: t.reasons,
    })),
  }

  const { data: upserted, error: upErr } = await supabase
    .from('match_results')
    .upsert(
      {
        match_request_id: matchRequestId,
        status: 'ready',
        ranker_version: RANKER_VERSION,
        generated_at: generatedAtIso,
        error_message: null,
        payload: payload as unknown as Json,
      },
      { onConflict: 'match_request_id' },
    )
    .select('id')
    .single()

  if (upErr || !upserted) {
    return { match_result_id: null, error: upErr?.message ?? 'upsert match_results failed' }
  }

  const matchResultId = upserted.id as string

  const { error: delErr } = await supabase
    .from('match_result_rows')
    .delete()
    .eq('match_result_id', matchResultId)

  if (delErr) {
    return { match_result_id: matchResultId, error: delErr.message }
  }

  if (top.length === 0) {
    return { match_result_id: matchResultId, error: null }
  }

  const insertRows = top.map((t, index) => ({
    match_result_id: matchResultId,
    rank: index + 1,
    professional_id: t.professional_id,
    portfolio_item_id: t.portfolio_item_id,
    total_score: t.total,
    component_scores: componentScoresJson(t.components) as unknown as Json,
    reasons: t.reasons,
  }))

  const { error: insErr } = await supabase.from('match_result_rows').insert(insertRows)

  if (insErr) {
    return { match_result_id: matchResultId, error: insErr.message }
  }

  return { match_result_id: matchResultId, error: null }
}

export async function persistMatchFailure(
  supabase: SupabaseClient,
  matchRequestId: string,
  message: string,
): Promise<{ match_result_id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('match_results')
    .upsert(
      {
        match_request_id: matchRequestId,
        status: 'failed',
        ranker_version: RANKER_VERSION,
        generated_at: new Date().toISOString(),
        error_message: message,
        payload: null,
      },
      { onConflict: 'match_request_id' },
    )
    .select('id')
    .single()

  if (error || !data) {
    return { match_result_id: null, error: error?.message ?? 'failed to persist failure row' }
  }

  const matchResultId = data.id as string
  await supabase.from('match_result_rows').delete().eq('match_result_id', matchResultId)
  return { match_result_id: matchResultId, error: null }
}
