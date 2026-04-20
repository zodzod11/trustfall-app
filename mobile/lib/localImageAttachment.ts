import * as FileSystem from 'expo-file-system/legacy'

import type { NotifyAttachmentPart } from '@/lib/notifyContactRequest'

export type LocalUploadSource = {
  bytes: ArrayBuffer
  filename: string
  contentType: string
}

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

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

export async function uriToUploadSource(
  uri: string,
  filename: string,
): Promise<LocalUploadSource | null> {
  if (!uri) return null
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    const safeName = filename?.trim() || 'image.jpg'
    return {
      bytes: base64ToArrayBuffer(base64),
      filename: safeName,
      contentType: contentTypeForFilename(safeName),
    }
  } catch {
    return null
  }
}

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
