import { useCallback, useState } from 'react'
import { submitMatchRequestFlowWithClient } from '../../src/lib/match/submitMatchFlowShared'
import type { MatchSubmissionState } from '../../src/lib/match/types'
import { uriToUploadSource } from '@/lib/localImageAttachment'
import { triggerMatchEngine } from '@/lib/match/triggerMatchEngine'
import { supabase } from '@/lib/supabase'
import type { MatchRequestDraft } from '@/types'

type MobileMatchImageSource =
  | {
      uri: string
      filename?: string
      contentType?: string
    }
  | null

export function useMatchSubmission() {
  const [state, setState] = useState<MatchSubmissionState>({ phase: 'idle' })

  const submit = useCallback(
    async (
      draft: MatchRequestDraft,
      files: { inspiration: MobileMatchImageSource; current: MobileMatchImageSource },
    ) => {
      setState({ phase: 'submitting' })

      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        const message = error?.message ?? 'Not authenticated'
        setState({ phase: 'error', message })
        return { ok: false as const, error: message }
      }

      const inspirationUpload = files.inspiration?.uri
        ? await uriToUploadSource(files.inspiration.uri, files.inspiration.filename || 'inspiration.jpg')
        : null
      const currentUpload = files.current?.uri
        ? await uriToUploadSource(files.current.uri, files.current.filename || 'current.jpg')
        : null

      if (files.inspiration?.uri && !inspirationUpload) {
        const message = 'Could not prepare the inspiration image for upload.'
        setState({ phase: 'error', message })
        return { ok: false as const, error: message }
      }
      if (files.current?.uri && !currentUpload) {
        const message = 'Could not prepare the current photo for upload.'
        setState({ phase: 'error', message })
        return { ok: false as const, error: message }
      }

      const result = await submitMatchRequestFlowWithClient({
        supabase,
        userId: data.user.id,
        draft,
        files: {
          inspiration: inspirationUpload,
          current: currentUpload,
        },
        trigger: triggerMatchEngine,
      })

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
