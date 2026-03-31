import type { MatchRequestDraft } from '../types'

const OPENING_LINE =
  'Hi, I’m interested in this style and wanted to check availability.'

/** Composes the match wizard answers into the booking request message body. */
export function buildMatchRequestPrefillMessage(
  request?: MatchRequestDraft | null,
): string {
  if (!request) return OPENING_LINE

  const lines: string[] = [OPENING_LINE, '']

  if (request.category) {
    lines.push(`Service category: ${request.category}`)
  }
  if (request.location.trim()) {
    lines.push(`Location / area: ${request.location.trim()}`)
  }
  if (request.tags.length > 0) {
    lines.push(`Style tags: ${request.tags.join(', ')}`)
  }
  if (request.notes.trim()) {
    lines.push('', 'My vision:', request.notes.trim())
  }
  if (request.imageName) {
    lines.push('', `Reference / inspiration: ${request.imageName}`)
  }
  if (request.currentPhotoName) {
    lines.push(`Current photo (from match flow): ${request.currentPhotoName}`)
  }

  return lines.join('\n')
}
