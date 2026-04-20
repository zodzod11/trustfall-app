/**
 * Spread items so the grid mixes categories (avoids one category dominating the grid
 * when personalization scores group categories together).
 */
export function interleaveExploreItemsByCategory<T extends { category: string }>(
  items: T[],
): T[] {
  if (items.length <= 1) return items
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const k = item.category
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(item)
  }
  if (buckets.size <= 1) return items

  const orderedCats = [...buckets.keys()].sort((a, b) => a.localeCompare(b))
  const maxLen = Math.max(...orderedCats.map((c) => buckets.get(c)!.length))
  const out: T[] = []
  for (let i = 0; i < maxLen; i++) {
    for (const c of orderedCats) {
      const row = buckets.get(c)!
      if (i < row.length) out.push(row[i])
    }
  }
  return out
}
