import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'

export type TriggerMatchEngineResult = { ok: boolean; error: string | null }

function matchEngineUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_MATCH_ENGINE_URL?.trim()
  if (envUrl) return envUrl.replace(/\/$/, '')

  const extraUrl =
    (Constants.expoConfig?.extra?.matchEngineUrl as string | undefined)?.trim() ??
    (Constants.manifest2?.extra?.expoClient?.extra?.matchEngineUrl as string | undefined)?.trim()
  if (extraUrl) return extraUrl.replace(/\/$/, '')

  return 'http://localhost:8788/api/match-run'
}

function localhostHint(url: string): string {
  if (!/localhost|127\.0\.0\.1/.test(url)) return ''
  return ' If you are testing on a real phone, localhost points at the phone. Set `EXPO_PUBLIC_MATCH_ENGINE_URL` to your computer IP on the same network, and keep the match engine running.'
}

export async function triggerMatchEngine(
  matchRequestId: string,
): Promise<TriggerMatchEngineResult> {
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

  const url = matchEngineUrl()
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ match_request_id: matchRequestId }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed'
    return {
      ok: false,
      error: `Could not reach the match engine at ${url}. ${message}.${localhostHint(url)}`.trim(),
    }
  }

  const text = await response.text()
  let json: { ok?: boolean; error?: string } | null = null
  try {
    json = text ? (JSON.parse(text) as { ok?: boolean; error?: string }) : null
  } catch {
    return { ok: false, error: text || `HTTP ${response.status}` }
  }

  if (!response.ok) {
    return { ok: false, error: json?.error ?? `HTTP ${response.status}` }
  }
  if (json?.ok === false) {
    return { ok: false, error: json.error ?? 'match engine failed' }
  }

  return { ok: true, error: null }
}
