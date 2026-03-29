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
  notes: string
  tags: string[]
  category: ServiceCategory | ''
  location: string
}

export type RequestSubmission = {
  portfolioItemId: string
  proName: string
  message: string
  preferredDate: string
  inspirationImageName: string
  currentPhotoName: string
  createdAt: string
}
