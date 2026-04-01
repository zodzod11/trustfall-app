import { useCallback, useState } from 'react'
import { submitMatchRequestFlow } from '../lib/match'
import type { MatchSubmissionState } from '../lib/match/types'
import type { MatchRequestDraft } from '../types'

export function useMatchSubmission() {
  const [state, setState] = useState<MatchSubmissionState>({ phase: 'idle' })

  const submit = useCallback(
    async (
      draft: MatchRequestDraft,
      files: { inspiration: File | null; current: File | null },
    ) => {
      setState({ phase: 'submitting' })
      const result = await submitMatchRequestFlow(draft, files)
      if (!result.ok) {
        setState({ phase: 'error', message: result.error })
        return { ok: false as const, error: result.error }
      }
      setState({ phase: 'done', matchRequestId: result.matchRequestId })
      return { ok: true as const, matchRequestId: result.matchRequestId }
    },
    [],
  )

  const reset = useCallback(() => {
    setState({ phase: 'idle' })
  }, [])

  return { state, submit, reset }
}
