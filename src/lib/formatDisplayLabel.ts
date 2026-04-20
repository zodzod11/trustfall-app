export function formatDisplayLabel(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  return trimmed
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}
