import { jaccard, tokenize } from './text'
import type { ComponentScore } from './types'
import { MATCH_WEIGHTS } from './weights'
import { roundScore } from './numbers'

/** Style tag overlap (request.tags vs portfolio item tags). */
export function scoreStyleTags(
  requestTags: string[],
  itemTagRows: { tag: string }[] | null | undefined,
): ComponentScore {
  const max = MATCH_WEIGHTS.styleTags
  const itemTags = (itemTagRows ?? []).map((r) => tokenize(r.tag)).flat()
  const req = requestTags.map((t) => tokenize(t)).flat().filter(Boolean)
  if (req.length === 0) {
    return {
      key: 'style_tags',
      points: roundScore(max * 0.65),
      max,
      label: 'no tags from you',
    }
  }
  if (itemTags.length === 0) {
    return { key: 'style_tags', points: roundScore(max * 0.25), max, label: 'untagged look' }
  }
  const jac = jaccard(req, itemTags)
  return {
    key: 'style_tags',
    points: roundScore(max * jac),
    max,
    label: jac >= 0.5 ? 'strong tag overlap' : jac >= 0.2 ? 'tag overlap' : 'light tag overlap',
  }
}
