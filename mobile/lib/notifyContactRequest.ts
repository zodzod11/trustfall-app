import Constants from 'expo-constants'

export type NotifyAttachmentPart = {
  filename: string
  contentType: string
  base64: string
}

export type NotifyContactRequestPayload = {
  portfolioItemId: string
  proName: string
  message: string
  preferredDate: string
  inspirationImageName: string
  currentPhotoName: string
  createdAt: string
  clientName: string
  clientEmail: string
  clientPhone: string
  portfolioImageUrl: string
  serviceTitle: string
  phoneNumber: string
  proEmail: string
  attachments: {
    inspiration: NotifyAttachmentPart | null
    current: NotifyAttachmentPart | null
  }
  /**
   * Object keys in the `client-uploads` bucket (same as `contact_requests.*_image_path`).
   * When set, the notify server issues fresh 7-day signed URLs for email — preferred over CID-only.
   */
  inspirationStoragePath?: string
  currentPhotoStoragePath?: string
}

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

export type NotifyContactRequestResult = {
  ok: boolean
  skipped?: boolean
  sent?: string[]
  warning?: string
}

export async function postNotifyContactRequest(
  body: NotifyContactRequestPayload,
): Promise<NotifyContactRequestResult> {
  const url = getNotifyApiUrl()
  if (!url) {
    return { ok: false, skipped: true, warning: 'notify_url_missing' }
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean
      sent?: string[]
      message?: string
      error?: string
      errors?: { sms?: string; email?: string }
    } | null
    const sentList = Array.isArray(data?.sent) ? data.sent : []
    const errSms = data?.errors?.sms
    const errEmail = data?.errors?.email
    const warnParts: string[] = []
    if (errSms) warnParts.push(`SMS: ${errSms}`)
    if (errEmail) warnParts.push(`Email: ${errEmail}`)

    if (response.ok && sentList.length > 0) {
      return { ok: true, sent: sentList }
    }
    if (warnParts.length > 0) {
      return { ok: false, warning: warnParts.join(' ') }
    }
    if (response.ok && sentList.length === 0) {
      return {
        ok: false,
        warning:
          data?.message ??
          'The notification service is running, but email or SMS isn’t configured yet.',
      }
    }
    return {
      ok: false,
      warning: data?.message ?? data?.error ?? `Something went wrong sending notifications (${response.status}).`,
    }
  } catch {
    return {
      ok: false,
      warning:
        'We couldn’t reach the notification service. Your request is still saved on this device.',
    }
  }
}
