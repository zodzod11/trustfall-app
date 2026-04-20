import type { RequestRecord } from '../../src/lib/requests/types'

export const REQUEST_HISTORY_PREVIEW_COUNT = 4
export const REQUEST_HISTORY_ALL_THRESHOLD = 15

export function getRequestSubmissionId(submission: RequestRecord): string {
  return submission.id
}

export function findRequestSubmissionById(
  submissions: RequestRecord[],
  id: string | null | undefined,
): RequestRecord | null {
  if (!id) return null
  return submissions.find((submission) => getRequestSubmissionId(submission) === id) ?? null
}

export function formatRequestSubmissionDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatRequestSubmissionTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function buildRequestSubmissionPreview(submission: RequestRecord): string {
  const raw = submission.message.trim()
  if (!raw) return 'Open to view request details.'
  return raw.length > 96 ? `${raw.slice(0, 93).trimEnd()}...` : raw
}

export function getRequestDisplayName(submission: RequestRecord): string {
  return submission.provider_name_snapshot?.trim() || 'Professional'
}

export function getRequestPortfolioImage(submission: RequestRecord): string | null {
  return submission.portfolio_image_url_snapshot?.trim() || null
}
