const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'on',
  'with',
  'at',
  'from',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'my',
  'your',
  'our',
  'their',
  'i',
  'we',
  'you',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'me',
  'just',
  'like',
  'get',
  'want',
  'need',
])

export function normalizeCategory(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-')
}

/** Alphanumeric tokens, lowercased, stopwords removed */
export function tokenize(text: string | null | undefined): string[] {
  if (!text?.trim()) return []
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9-]/g, ''))
    .filter((t) => t.length > 1 && !STOP.has(t))
  return raw
}

export function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)]
}

/** |A ∩ B| / |A ∪ B| */
export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const A = new Set(a)
  const B = new Set(b)
  let inter = 0
  for (const x of A) {
    if (B.has(x)) inter += 1
  }
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}

/** |A ∩ B| / |A| when A is request tokens (recall-oriented overlap) */
export function overlapRatio(requestTokens: string[], corpusTokens: string[]): number {
  if (requestTokens.length === 0 || corpusTokens.length === 0) return 0
  const C = new Set(corpusTokens)
  let hit = 0
  for (const t of requestTokens) {
    if (C.has(t)) hit += 1
  }
  return hit / requestTokens.length
}

export function mergeTextParts(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
