/**
 * Tunable caps for the rules-based MVP matcher (points sum to 100 before rounding).
 * Adjust these first when tuning — each scorer scales into its cap internally.
 *
 * Trustfall priorities:
 * - Desired look (style text + tags) > service fit > location/budget/quality
 * - Current look is intentionally smaller (supporting signal only)
 */
export const MATCH_WEIGHTS = {
  /** Portfolio item + pro category vs request service type */
  serviceType: 15,
  /** Jaccard overlap between request tags and portfolio item tags */
  styleTags: 20,
  /**
   * Word overlap between desired-style copy and portfolio-first corpus
   * (tags, service title, pro title, about excerpt). Primary “curated” signal.
   */
  desiredStyle: 22,
  /** Smaller overlap using current_state_text vs the same corpus */
  currentLook: 8,
  /** Request budget range vs portfolio item price */
  budget: 12,
  /** Request location vs professional city */
  location: 10,
  /** Rating, review volume, experience (portfolio / pro quality) */
  quality: 8,
  /** When the user pinned a saved portfolio look as reference */
  savedLookBoost: 5,
} as const

export type MatchWeightKey = keyof typeof MATCH_WEIGHTS

export const RANKER_VERSION = 'rules-mvp-1' as const

export const TOP_N = 20
