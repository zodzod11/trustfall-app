/** Supabase-backed table types (see `database/README.md` for codegen). */
export type * from './database'

/** User-side domain inputs (services/user, domain/user). */
export type * from '../domain/user'

export type ServiceCategory = 'hair' | 'nails' | 'makeup' | 'tattoo'

export type User = {
  id: string
  firstName: string
  lastName: string
  email: string
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
  /** Consumer-facing service grouping (e.g. haircut, color, nail art). */
  serviceType?: string
  /** Optional appointment length for services tab and list cards. */
  durationMinutes?: number
  tags: string[]
  category: ServiceCategory
  /** Piece-specific copy; shown on portfolio detail when set. */
  description?: string
}

export type PortfolioFeedItem = PortfolioItem & {
  professionalName: string
  professionalTitle: string
  location: string
  professionalPhone?: string
  professionalEmail?: string
  /** Set when using Supabase catalog or seed detail screens */
  professionalRating?: number
  professionalReviewCount?: number
  professionalRequestCount?: number
  professionalYearsExperience?: number
  professionalAbout?: string
}

export type Professional = {
  id: string
  displayName: string
  title: string
  category: ServiceCategory
  city: string
  rating: number
  reviewCount: number
  /** Match / contact requests shown on pro storefront (separate from reviews). */
  requestCount: number
  yearsExperience: number
  about: string
  bookingPhone?: string
  bookingEmail?: string
  portfolioItems: PortfolioItem[]
}

/** Structured location for matching / future radius search (Step 4). */
export type MatchLocationPick = {
  source: 'current_location' | 'manual'
  city: string
  state: string
  zip?: string
  latitude: number
  longitude: number
}

export type MatchDatePreset = 'today' | 'this_weekend' | 'next_week' | 'anytime'

export type MatchDateSelection =
  | { type: 'exact'; exactDate: string }
  | { type: 'range'; startDate: string; endDate: string }
  | { type: 'preset'; preset: MatchDatePreset }

export type MatchTimeBlock = 'morning' | 'afternoon' | 'evening' | 'night'

export type MatchTimeSelection =
  | {
      type: 'block'
      blocks: MatchTimeBlock[]
    }
  | {
      type: 'exact'
      exactTime: string
    }
  | {
      type: 'range'
      startTime: string
      endTime: string
    }

/** Step 4 “Refine your match” — structured fields for backend / ranking. */
export type MatchRefinement = {
  location?: MatchLocationPick
  /** Preferred search radius around selected location. */
  radiusMiles?: number
  date?: MatchDateSelection
  time?: MatchTimeSelection
}

export type MatchRequestDraft = {
  imageName: string
  currentPhotoName?: string
  /** Local file URI for inspiration image preview (Expo ImagePicker). */
  inspirationUri?: string
  /** Local file URI for “current photo” preview. */
  currentPhotoUri?: string
  notes: string
  /** Mirrors web match payload fields when present. */
  desiredStyleText?: string
  currentStateText?: string
  budgetMin?: string
  budgetMax?: string
  savedLookPortfolioItemId?: string
  tags: string[]
  category: ServiceCategory | 'brows' | 'tattoo' | ''
  /** Display line derived from `refinement.location` (ranking + prefill). */
  location: string
  /** Structured Step 4 data — prefer this for filters / API. */
  refinement: MatchRefinement
}

export type MatchResultsMatchedPiece = {
  id: string
  /** Primary “after” image for thumbnails and booking. */
  imageUrl: string
  /** When present, enables full before/after review in Match (same as Explore detail). */
  beforeImageUrl?: string
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
  /** Internal ranking score */
  score?: number
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
  portfolioImageUrl?: string
  /** Local file URI (Expo ImagePicker / draft) — shown in request UI. */
  inspirationUri?: string
  currentPhotoUri?: string
}
