import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchMatchRequest } from './fetchMatchRequest'
import { loadPublishedCatalog } from './loadCatalog'
import { persistMatchFailure, persistMatchResults, upsertMatchResultPending } from './persistResults'
import { scoreCatalogRow } from './scoreCatalogRow'
import type { MatchEngineResult, ScoredPortfolioItem } from './types'
import { RANKER_VERSION, TOP_N } from './weights'

function sortScored(a: ScoredPortfolioItem, b: ScoredPortfolioItem): number {
  if (b.total !== a.total) return b.total - a.total
  return a.portfolio_item_id.localeCompare(b.portfolio_item_id)
}

/**
 * Trustfall rules-based MVP matcher: loads the request + catalog, scores every
 * published portfolio item, keeps the top {TOP_N}, and persists `match_results`
 * + `match_result_rows`.
 *
 * Call with a **service role** Supabase client (Edge Function, secure server route).
 */
export async function runMatchForRequest(
  supabase: SupabaseClient,
  matchRequestId: string,
): Promise<MatchEngineResult> {
  const { row: req, error: reqErr } = await fetchMatchRequest(supabase, matchRequestId)
  if (reqErr) {
    return { ok: false, match_request_id: matchRequestId, error: reqErr }
  }
  if (!req) {
    return { ok: false, match_request_id: matchRequestId, error: 'match_request not found' }
  }

  const tags = Array.isArray(req.tags) ? req.tags : []

  const request = { ...req, tags }

  const pend = await upsertMatchResultPending(supabase, matchRequestId)
  if (pend.error) {
    return { ok: false, match_request_id: matchRequestId, error: pend.error }
  }

  const { rows, error: catErr } = await loadPublishedCatalog(supabase)
  if (catErr) {
    const fail = await persistMatchFailure(
      supabase,
      matchRequestId,
      `catalog load failed: ${catErr}`,
    )
    return {
      ok: false,
      match_request_id: matchRequestId,
      error: catErr,
      match_result_id: fail.match_result_id ?? undefined,
    }
  }

  const scored = rows.map((r) => scoreCatalogRow(request, r))
  scored.sort(sortScored)
  const top = scored.slice(0, TOP_N)

  const generatedAt = new Date().toISOString()
  const { match_result_id, error: persistErr } = await persistMatchResults(
    supabase,
    matchRequestId,
    top,
    generatedAt,
  )

  if (persistErr || !match_result_id) {
    const fail = await persistMatchFailure(
      supabase,
      matchRequestId,
      persistErr ?? 'persist match results failed',
    )
    return {
      ok: false,
      match_request_id: matchRequestId,
      error: persistErr ?? 'persist match results failed',
      match_result_id: fail.match_result_id ?? undefined,
    }
  }

  return {
    ok: true,
    match_result_id,
    match_request_id: matchRequestId,
    ranker_version: RANKER_VERSION,
    rows_written: top.length,
    top,
  }
}
