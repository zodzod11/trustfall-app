import Constants from 'expo-constants'
import { notifyProvider } from '../../src/lib/requests/notify'
import type { NotifyAttachmentPart, NotifyProviderPayload, NotifyProviderResult } from '../../src/lib/requests/types'

export type { NotifyAttachmentPart }
export type NotifyContactRequestPayload = NotifyProviderPayload

function readNotifyExtra(): { notifyApiUrl?: string } {
  const fromExpo = Constants.expoConfig?.extra as { notifyApiUrl?: string } | undefined
  const fromManifest = (Constants as { manifest?: { extra?: { notifyApiUrl?: string } } }).manifest?.extra
  return { ...fromManifest, ...fromExpo }
}

export function getNotifyApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_NOTIFY_API_URL?.trim()
  if (fromEnv) return fromEnv
  return readNotifyExtra().notifyApiUrl?.trim() ?? ''
}

export type NotifyContactRequestResult = NotifyProviderResult

export async function postNotifyContactRequest(
  body: NotifyContactRequestPayload,
): Promise<NotifyContactRequestResult> {
  const result = await notifyProvider(getNotifyApiUrl(), body)
  if (!result.warning) return result
  if (!/localhost|127\.0\.0\.1/.test(getNotifyApiUrl())) return result
  return {
    ...result,
    warning:
      result.warning +
      ' On a real phone, localhost points at the phone—use your computer’s IP (same Wi-Fi) in EXPO_PUBLIC_NOTIFY_API_URL. Keep `npm run notify:server` running.',
  }
}
