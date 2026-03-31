export const MATCH_UPLOAD_SESSION_KEY = 'trustfall:match-request-uploads:v1'

type StoredPart = {
  filename: string
  contentType: string
  base64: string
}

async function fileToPart(file: File): Promise<StoredPart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      const base64 = comma >= 0 ? result.slice(comma + 1) : result
      resolve({
        filename: file.name || 'image',
        contentType: file.type || 'application/octet-stream',
        base64,
      })
    }
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

function base64ToFile(part: StoredPart): File {
  const bin = atob(part.base64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new File([arr], part.filename, { type: part.contentType })
}

/** Persist files before navigating to match results so Request can attach them. */
export async function persistMatchUploadSession(
  inspiration: File | null,
  current: File | null,
): Promise<void> {
  try {
    if (!inspiration && !current) {
      sessionStorage.removeItem(MATCH_UPLOAD_SESSION_KEY)
      return
    }
    const payload: { inspiration?: StoredPart; current?: StoredPart } = {}
    if (inspiration) payload.inspiration = await fileToPart(inspiration)
    if (current) payload.current = await fileToPart(current)
    sessionStorage.setItem(MATCH_UPLOAD_SESSION_KEY, JSON.stringify(payload))
  } catch {
    sessionStorage.removeItem(MATCH_UPLOAD_SESSION_KEY)
  }
}

export function readMatchUploadFilesFromSession(): {
  inspiration: File | null
  current: File | null
} {
  const raw = sessionStorage.getItem(MATCH_UPLOAD_SESSION_KEY)
  if (!raw) return { inspiration: null, current: null }
  try {
    const parsed = JSON.parse(raw) as {
      inspiration?: StoredPart
      current?: StoredPart
    }
    return {
      inspiration: parsed.inspiration ? base64ToFile(parsed.inspiration) : null,
      current: parsed.current ? base64ToFile(parsed.current) : null,
    }
  } catch {
    return { inspiration: null, current: null }
  }
}

export function clearMatchUploadSession(): void {
  sessionStorage.removeItem(MATCH_UPLOAD_SESSION_KEY)
}
