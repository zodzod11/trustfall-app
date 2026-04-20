import type {
  MatchDateSelection,
  MatchLocationPick,
  MatchRefinement,
  MatchTimeSelection,
} from '@/types'

export const MAX_STYLE_TAGS = 4

function formatCalendarDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return iso
  return new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatClockTime(iso: string): string {
  const [hours, minutes] = iso.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return iso
  const d = new Date()
  d.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatLocationLine(loc: MatchLocationPick): string {
  const z = loc.zip ? ` ${loc.zip}` : ''
  return `${loc.city}, ${loc.state}${z}`.trim()
}

export function formatRadiusMiles(radiusMiles: number | undefined): string {
  if (!radiusMiles || !Number.isFinite(radiusMiles)) return '—'
  return `${Math.round(radiusMiles)} mi`
}

const PRESET_LABEL: Record<'today' | 'this_weekend' | 'next_week' | 'anytime', string> = {
  today: 'Today',
  this_weekend: 'This weekend',
  next_week: 'Next week',
  anytime: 'Anytime',
}

export function formatDateDisplay(date: MatchDateSelection | undefined): string {
  if (!date) return '—'
  if (date.type === 'preset') return PRESET_LABEL[date.preset]
  if (date.type === 'exact') return formatCalendarDate(date.exactDate)
  return `${formatCalendarDate(date.startDate)} → ${formatCalendarDate(date.endDate)}`
}

export function formatTimeDisplay(time: MatchTimeSelection | undefined): string {
  const labels: Record<string, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
  }
  if (!time) return '—'
  if (time.type === 'block') {
    if (!time.blocks.length) return '—'
    return time.blocks.map((b) => labels[b] ?? b).join(', ')
  }
  if (time.type === 'exact') {
    return time.exactTime.trim() ? formatClockTime(time.exactTime) : '—'
  }
  if (!time.startTime.trim() || !time.endTime.trim()) return '—'
  return `${formatClockTime(time.startTime)} → ${formatClockTime(time.endTime)}`
}

export function isLocationComplete(refinement: MatchRefinement): boolean {
  const loc = refinement.location
  if (!loc || !loc.city.trim() || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) {
    return false
  }
  return true
}

export function isDateTimeComplete(refinement: MatchRefinement): boolean {
  const d = refinement.date
  if (!d) return false
  if (d.type === 'exact' && !d.exactDate?.trim()) return false
  if (d.type === 'range') {
    if (!d.startDate?.trim() || !d.endDate?.trim()) return false
    if (d.startDate > d.endDate) return false
  }
  const time = refinement.time
  if (!time) return false
  if (time.type === 'block' && !time.blocks.length) return false
  if (time.type === 'exact' && !time.exactTime.trim()) return false
  if (time.type === 'range') {
    if (!time.startTime.trim() || !time.endTime.trim()) return false
    if (time.startTime > time.endTime) return false
  }
  return true
}

/** True when tag list is allowed (optional tags; max count; no empty entries). */
export function isTagsSelectionValid(tags: string[]): boolean {
  if (tags.length > MAX_STYLE_TAGS) return false
  return tags.every((t) => t.trim().length > 0)
}

export function isRefinementComplete(refinement: MatchRefinement, tags: string[]): boolean {
  return (
    isLocationComplete(refinement) &&
    isDateTimeComplete(refinement) &&
    isTagsSelectionValid(tags)
  )
}

/** City string for legacy ranking that matched on `pro.city`. */
export function rankingLocationQuery(refinement: MatchRefinement, fallbackLine: string): string {
  const c = refinement.location?.city?.trim().toLowerCase()
  if (c) return c
  return fallbackLine.trim().toLowerCase()
}
