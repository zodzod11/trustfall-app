import * as FileSystem from 'expo-file-system/legacy'

import type { NotifyAttachmentPart } from '@/lib/notifyContactRequest'

function contentTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

function extForUri(uri: string, filename: string): 'jpg' | 'jpeg' | 'png' | 'webp' {
  const ref = (filename || uri).toLowerCase()
  if (ref.endsWith('.png')) return 'png'
  if (ref.endsWith('.webp')) return 'webp'
  if (ref.endsWith('.jpeg') || ref.endsWith('.jpg')) return 'jpg'
  return 'jpg'
}

export { extForUri }

/** Read a local `file://` or content URI into base64 for the notify API (SendGrid). */
export async function uriToNotifyAttachment(
  uri: string,
  filename: string,
): Promise<NotifyAttachmentPart | null> {
  if (!uri) return null
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    const safeName = filename?.trim() || 'image.jpg'
    return {
      filename: safeName,
      contentType: contentTypeForFilename(safeName),
      base64,
    }
  } catch {
    return null
  }
}
