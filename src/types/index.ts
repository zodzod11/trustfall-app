export type ExploreCard = {
  id: string
  title: string
  subtitle: string
  imageGradient: string
  tag: string
}

export type MatchResultItem = {
  id: string
  name: string
  scoreLabel: string
  blurb: string
}

export type ServiceCategory = 'barber' | 'hair' | 'nails' | 'makeup'

export type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  /** Optional — used for request contact prefills / future auth profile. */
  phone?: string
  city: string
  preferredCategories: ServiceCategory[]
  budgetMin: number
  budgetMax: number
}

export type PortfolioItem = {
  id: string
  professionalId: string
  beforeImageUrl: string
  afterImageUrl: string
  price: number
  serviceTitle: string
  tags: string[]
  category: ServiceCategory
}

export type Professional = {
  id: string
  displayName: string
  title: string
  category: ServiceCategory
  city: string
  rating: number
  reviewCount: number
  yearsExperience: number
  about: string
  /** Mock / placeholder contact for Call, Text, and notifications (E.164 when possible). */
  bookingPhone?: string
  bookingEmail?: string
  portfolioItems: PortfolioItem[]
}

export type RequestStatus = 'pending' | 'matched' | 'booked' | 'closed'

export type Request = {
  id: string
  userId: string
  category: ServiceCategory
  serviceTitle: string
  budget: number
  preferredDate: string
  notes: string
  status: RequestStatus
}

export type SavedItem = {
  id: string
  userId: string
  professionalId: string
  savedAt: string
  note?: string
}

export type MatchResult = {
  id: string
  requestId: string
  userId: string
  professionalId: string
  score: number
  scoreLabel: string
  reasons: string[]
}

export type MatchRequestDraft = {
  imageName: string
  currentPhotoName?: string
  /** Free-form vision copy; maps to `vision_notes` / legacy combined notes when persisting. */
  notes: string
  /** Maps to `desired_style_text` when persisting to Supabase. */
  desiredStyleText?: string
  /** Maps to `current_state_text`. */
  currentStateText?: string
  /** Optional budget range — maps to `budget_min` / `budget_max`. */
  budgetMin?: string
  budgetMax?: string
  /** When set from a saved Explore look, maps to `saved_look_portfolio_item_id`. */
  savedLookPortfolioItemId?: string
  tags: string[]
  category: ServiceCategory | 'brows' | 'tattoo' | ''
  location: string
}

/** Match results list — paired portfolio thumbnails per professional. */
export type MatchResultsMatchedPiece = {
  id: string
  imageUrl: string
  serviceTitle: string
  scoreLabel: string
}

export type MatchResultsRankedProfessional = {
  id: string
  name: string
  title: string
  city: string
  rating: number
  portfolioImageUrl: string
  portfolioItemId: string
  serviceTitle: string
  phoneNumber: string
  proEmail?: string
  scoreLabel: string
  labels: string[]
  matchedPieces: MatchResultsMatchedPiece[]
  /** Numeric score when sourced from Supabase match_result_rows */
  score?: number
}

export type RequestSubmission = {
  portfolioItemId: string
  proName: string
  message: string
  preferredDate: string
  inspirationImageName: string
  currentPhotoName: string
  createdAt: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  /** Selected look preview URL (https) — shown in notification email. */
  portfolioImageUrl?: string
}
