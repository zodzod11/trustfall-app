import { useMemo } from 'react'
import { createClient } from '../lib/client'
import { useMatchRunResultsClient } from './useMatchRunResultsClient'

/**
 * Polls `match_results` for a submitted `match_request_id` until ready/failed or timeout.
 */
export function useMatchRunResults(matchRequestId: string | undefined) {
  const supabase = useMemo(() => createClient(), [])
  return useMatchRunResultsClient(supabase, matchRequestId)
}
