/** Light validation helpers — no external deps. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function isOptionalUuid(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true
  return typeof v === 'string' && UUID_RE.test(v)
}

export function requireUuid(label: string, v: unknown): string | null {
  if (typeof v !== 'string' || !UUID_RE.test(v)) return `${label} must be a valid UUID`
  return null
}

export function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(n)))
}
