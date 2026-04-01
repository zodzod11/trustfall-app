/** Supabase-backed table types (see `database/README.md` for codegen). */
export type * from './database'

/** User-side domain inputs (services/user, domain/user). */
export type * from '../domain/user'

export type ServiceCategory = 'barber' | 'hair' | 'nails' | 'makeup'

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
  tags: string[]
  category: ServiceCategory
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
  yearsExperience: number
  about: string
  bookingPhone?: string
  bookingEmail?: string
  portfolioItems: PortfolioItem[]
}

export type MatchRequestDraft = {
  imageName: string
  currentPhotoName?: string
  /** Local file URI for inspiration image preview (Expo ImagePicker). */
  inspirationUri?: string
  /** Local file URI for “current photo” preview. */
  currentPhotoUri?: string
  notes: string
  tags: string[]
  category: ServiceCategory | 'brows' | 'tattoo' | ''
  location: string
}

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
  /** Internal ranking score */
  score: number
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
