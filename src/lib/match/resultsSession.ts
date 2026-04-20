import type { MatchRequestDraft } from '../../types'

const MATCH_RESULTS_SESSION_KEY = 'trustfall:match-results:v1'

type PersistedMatchResults = {
  matchRequestId: string
  request: MatchRequestDraft
  savedAt: number
}

function readAll(): PersistedMatchResults[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(MATCH_RESULTS_SESSION_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PersistedMatchResults[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(entries: PersistedMatchResults[]): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(MATCH_RESULTS_SESSION_KEY, JSON.stringify(entries.slice(0, 8)))
  } catch {
    /* ignore */
  }
}

export function persistMatchResultsRequest(matchRequestId: string, request: MatchRequestDraft): void {
  const existing = readAll().filter((entry) => entry.matchRequestId !== matchRequestId)
  writeAll([{ matchRequestId, request, savedAt: Date.now() }, ...existing])
}

export function readPersistedMatchResultsRequest(
  matchRequestId: string | null | undefined,
): MatchRequestDraft | null {
  if (!matchRequestId) return null
  return readAll().find((entry) => entry.matchRequestId === matchRequestId)?.request ?? null
}
