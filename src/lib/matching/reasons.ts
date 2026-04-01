import type { ComponentScore } from './types'

const strength = (c: ComponentScore) => (c.max === 0 ? 0 : c.points / c.max)

function lineFor(c: ComponentScore): string | null {
  const s = strength(c)
  if (s < 0.22) return null

  switch (c.key) {
    case 'saved_look':
      return s >= 0.95 ? 'Aligned with the look you saved' : null
    case 'desired_style':
      if (s >= 0.62) return 'Handpicked for how you described your desired look'
      if (s >= 0.38) return 'Echoes the style details you shared'
      return 'Touches on your written style notes'
    case 'style_tags':
      if (s >= 0.55) return 'Overlap with the style tags you care about'
      if (s >= 0.3) return 'Shares some of your style tags'
      return null
    case 'service_type':
      if (s >= 0.85) return 'Service type matches what you asked for'
      if (s >= 0.45) return 'A related service match for your request'
      return null
    case 'current_look':
      if (s >= 0.42) return 'Fits the starting point you described for your current look'
      return null
    case 'budget':
      if (s >= 0.88) return 'Fits the budget range you gave'
      if (s >= 0.5) return 'Reasonably close to your budget'
      return null
    case 'location':
      if (s >= 0.85) return 'Near the location you mentioned'
      if (s >= 0.45) return 'In the general area you’re considering'
      return null
    case 'quality':
      if (s >= 0.65) return 'Strong portfolio and professional signals'
      if (s >= 0.38) return 'Reliable reviews and experience'
      return null
    default:
      return null
  }
}

/** Curated, human-readable reasons (no AI — template copy from component scores). */
export function buildCuratedReasons(components: ComponentScore[]): string[] {
  const ordered = [...components].sort((a, b) => strength(b) - strength(a))
  const out: string[] = []
  for (const c of ordered) {
    const line = lineFor(c)
    if (line) out.push(line)
    if (out.length >= 5) break
  }
  if (out.length === 0) {
    out.push('Curated from published looks that fit your request')
  }
  return out
}
