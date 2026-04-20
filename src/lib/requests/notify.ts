import type { NotifyProviderPayload, NotifyProviderResult } from './types'

export async function notifyProvider(
  endpoint: string,
  body: NotifyProviderPayload,
): Promise<NotifyProviderResult> {
  const url = endpoint.trim()
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
    const warnParts: string[] = []
    if (data?.errors?.sms) warnParts.push(`SMS: ${data.errors.sms}`)
    if (data?.errors?.email) warnParts.push(`Email: ${data.errors.email}`)

    if (response.ok && sentList.length > 0) {
      return { ok: true, sent: sentList }
    }
    if (warnParts.length > 0) {
      return { ok: false, warning: warnParts.join(' ') }
    }
    if (response.ok) {
      return {
        ok: false,
        warning:
          data?.message ??
          'The notification service is running, but email or SMS is not configured yet.',
      }
    }

    return {
      ok: false,
      warning:
        data?.message ??
        data?.error ??
        `Something went wrong sending notifications (${response.status}).`,
    }
  } catch {
    return {
      ok: false,
      warning: 'Could not reach the notification service after saving the request.',
    }
  }
}
