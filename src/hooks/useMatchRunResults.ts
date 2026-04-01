import { useEffect, useState } from 'react'
import { createClient } from '../lib/client'
import {
  fetchMatchResultByRequestId,
  mapMatchRowsToRankedProfessionals,
} from '../lib/match'
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
 * Polls `match_results` for a submitted `match_request_id` until ready/failed or timeout.
 */
export function useMatchRunResults(matchRequestId: string | undefined) {
  const [ranked, setRanked] = useState<MatchResultsRankedProfessional[]>([])
  const [status, setStatus] = useState<MatchRunStatus>(() =>
    matchRequestId ? 'loading' : 'idle',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!matchRequestId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when no request id
      setRanked([])
      setStatus('idle')
      setErrorMessage(null)
      return
    }

    let cancelled = false
    const id = matchRequestId

    async function poll() {
      setStatus('loading')
      setErrorMessage(null)

      for (let i = 0; i < MAX_POLLS; i++) {
        if (cancelled) return

        const supabase = createClient()
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
          await new Promise((r) => setTimeout(r, POLL_MS))
          continue
        }

        if (result.status === 'failed') {
          setErrorMessage(result.error_message ?? 'Match generation failed')
          setStatus('failed')
          return
        }

        if (result.status === 'pending') {
          setStatus('processing')
          await new Promise((r) => setTimeout(r, POLL_MS))
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
  }, [matchRequestId])

  return {
    ranked,
    status,
    errorMessage,
    isPending: status === 'loading' || status === 'processing',
  }
}
