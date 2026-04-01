import { buildPortfolioCorpusShared } from './corpus'
import { mergeTextParts, overlapRatio, tokenize, uniqueTokens } from './text'
import type { CatalogPortfolioRow, ComponentScore } from './types'
import { MATCH_WEIGHTS } from './weights'
import { roundScore } from './numbers'

/**
 * Primary “desired look” signal: text overlap between what the client wrote and
 * portfolio-first corpus (tags, service title, pro title, about).
 */
export function scoreDesiredStyle(
  desiredStyleText: string | null | undefined,
  visionNotes: string | null | undefined,
  row: CatalogPortfolioRow,
): ComponentScore {
  const max = MATCH_WEIGHTS.desiredStyle
  const prose = mergeTextParts(desiredStyleText, visionNotes).trim()
  const requestTokens = uniqueTokens(tokenize(prose))
  if (requestTokens.length === 0) {
    return {
      key: 'desired_style',
      points: roundScore(max * 0.55),
      max,
      label: 'no style notes',
    }
  }

  const corpus = buildPortfolioCorpusShared(row)
  const ratio = overlapRatio(requestTokens, corpus)
  const boosted = Math.min(1, ratio * 1.15)
  return {
    key: 'desired_style',
    points: roundScore(max * boosted),
    max,
    label:
      boosted >= 0.55
        ? 'strong style match'
        : boosted >= 0.28
          ? 'matches your described style'
          : 'light style match',
  }
}
