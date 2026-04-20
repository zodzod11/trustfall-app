import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { fetchMatchResultByRequestId } from '../lib/match/fetchMatchResults'
import { mapMatchRowsToRankedProfessionals } from '../lib/match/mapMatchRowsToRanked'
import type { MatchResultsRankedProfessional } from '../types'

export type MatchRunStatus =
  | 'idle'
  | 'loading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'timeout'

const POLL_MS = 1600
const MAX_POLLS = 50

/**
 * Shared polling hook for any client that can supply a Supabase instance.
 */
export function useMatchRunResultsClient(
  supabase: SupabaseClient,
  matchRequestId: string | undefined,
) {
  const [ranked, setRanked] = useState<MatchResultsRankedProfessional[]>([])
  const [status, setStatus] = useState<MatchRunStatus>(() =>
    matchRequestId ? 'loading' : 'idle',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!matchRequestId) {
      const resetTimer = setTimeout(() => {
        if (cancelled) return
        setRanked([])
        setStatus('idle')
        setErrorMessage(null)
      }, 0)
      return () => {
        cancelled = true
        clearTimeout(resetTimer)
      }
    }

    const id = matchRequestId

    async function poll() {
      setStatus('loading')
      setErrorMessage(null)

      for (let i = 0; i < MAX_POLLS; i++) {
        if (cancelled) return

        const { result, rows, error: fetchErr } = await fetchMatchResultByRequestId(
          supabase,
          id,
        )

        if (cancelled) return

        if (fetchErr) {
          setErrorMessage(fetchErr)
          setStatus('failed')
          return
        }

        if (!result) {
          setStatus('processing')
          await new Promise((resolve) => setTimeout(resolve, POLL_MS))
          continue
        }

        if (result.status === 'failed') {
          setErrorMessage(result.error_message ?? 'Match generation failed')
          setStatus('failed')
          return
        }

        if (result.status === 'pending') {
          setStatus('processing')
          await new Promise((resolve) => setTimeout(resolve, POLL_MS))
          continue
        }

        if (result.status === 'ready') {
          setRanked(mapMatchRowsToRankedProfessionals(rows))
          setStatus('ready')
          return
        }
      }

      if (!cancelled) {
        setStatus('timeout')
        setErrorMessage('Still processing. Refresh this page in a moment.')
      }
    }

    void poll()

    return () => {
      cancelled = true
    }
  }, [matchRequestId, supabase])

  return {
    ranked,
    status,
    errorMessage,
    isPending: status === 'loading' || status === 'processing',
  }
}
