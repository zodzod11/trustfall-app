import { useMatchRunResultsClient } from '../../src/hooks/useMatchRunResultsClient'
import { supabase } from '@/lib/supabase'

export function useMatchRunResults(matchRequestId: string | undefined) {
  return useMatchRunResultsClient(supabase, matchRequestId)
}
