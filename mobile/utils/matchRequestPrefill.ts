import type { MatchRequestDraft } from '@/types'
import { formatDisplayLabel } from '@/lib/formatDisplayLabel'
import {
  formatDateDisplay,
  formatLocationLine,
  formatRadiusMiles,
  formatTimeDisplay,
} from '@/lib/match/refinementFormat'

const OPENING_LINE =
  'Hi, I’m interested in this style and wanted to check availability.'

export function buildMatchRequestPrefillMessage(
  request?: MatchRequestDraft | null,
): string {
  if (!request) return OPENING_LINE

  const lines: string[] = [OPENING_LINE, '']

  if (request.category) {
    lines.push(`Service category: ${formatDisplayLabel(request.category)}`)
  }

  if (request.refinement.location) {
    const loc = request.refinement.location
    lines.push(`Location: ${formatLocationLine(loc)}`)
    if (request.refinement.radiusMiles) {
      lines.push(`Radius: ${formatRadiusMiles(request.refinement.radiusMiles)}`)
    }
    lines.push(
      `Coordinates: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)} (${loc.source})`,
    )
  } else if (request.location.trim()) {
    lines.push(`Location / area: ${request.location.trim()}`)
  }

  if (request.refinement.date) {
    lines.push(`Preferred date: ${formatDateDisplay(request.refinement.date)}`)
  }
  if (request.refinement.time) {
    lines.push(`Preferred time: ${formatTimeDisplay(request.refinement.time)}`)
  }

  if (request.tags.length > 0) {
    lines.push(`Style tags: ${request.tags.map(formatDisplayLabel).join(', ')}`)
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
