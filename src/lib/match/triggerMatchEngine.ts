import { createClient } from '../client'

export type TriggerMatchEngineResult = { ok: boolean; error: string | null }

function matchEngineUrl(): string {
  const u = import.meta.env.VITE_MATCH_ENGINE_URL as string | undefined
  if (u?.trim()) return u.trim().replace(/\/$/, '')
  return '/api/match-run'
}

/**
 * Calls the secure match runner (service role) with the user JWT.
 * Configure VITE_MATCH_ENGINE_URL for production (e.g. Edge Function URL).
 */
export async function triggerMatchEngine(
  matchRequestId: string,
): Promise<TriggerMatchEngineResult> {
  const supabase = createClient()
  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession()
  if (sessionErr) {
    return { ok: false, error: sessionErr.message }
  }
  if (!session?.access_token) {
    return { ok: false, error: 'No active session' }
  }

  const url = `${matchEngineUrl()}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ match_request_id: matchRequestId }),
  })

  const text = await res.text()
  let json: { ok?: boolean; error?: string } | null = null
  try {
    json = text ? (JSON.parse(text) as { ok?: boolean; error?: string }) : null
  } catch {
    return { ok: false, error: text || `HTTP ${res.status}` }
  }

  if (!res.ok) {
    return { ok: false, error: json?.error ?? `HTTP ${res.status}` }
  }
  if (json && json.ok === false) {
    return { ok: false, error: json.error ?? 'match engine failed' }
  }
  return { ok: true, error: null }
}
