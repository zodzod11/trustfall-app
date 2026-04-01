/** match_results row (subset) for client reads */
export type MatchResultStatus = 'pending' | 'ready' | 'failed'

export type MatchResultRecord = {
  id: string
  match_request_id: string
  status: MatchResultStatus
  ranker_version: string
  error_message: string | null
  generated_at: string | null
  payload: unknown | null
}

export type MatchImagePaths = {
  inspiration_image_path: string | null
  current_photo_path: string | null
}

export type MatchResultRowRecord = {
  id: string
  match_result_id: string
  rank: number
  professional_id: string
  portfolio_item_id: string
  total_score: string | number
  component_scores: Record<string, number>
  reasons: string[]
}

export type MatchSubmissionState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'done'; matchRequestId: string }
  | { phase: 'error'; message: string }
