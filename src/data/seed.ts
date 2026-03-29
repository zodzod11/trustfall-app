import type {
  MatchResult,
  PortfolioItem,
  Professional,
  Request,
  SavedItem,
  User,
} from '../types'

export const usersSeed: User[] = [
  {
    id: 'u_001',
    firstName: 'Maya',
    lastName: 'Johnson',
    email: 'maya.johnson@example.com',
    city: 'Houston',
    preferredCategories: ['hair', 'makeup'],
    budgetMin: 85,
    budgetMax: 240,
  },
  {
    id: 'u_002',
    firstName: 'Chris',
    lastName: 'Davis',
    email: 'chris.davis@example.com',
    city: 'Austin',
    preferredCategories: ['barber'],
    budgetMin: 35,
    budgetMax: 110,
  },
  {
    id: 'u_003',
    firstName: 'Alina',
    lastName: 'Patel',
    email: 'alina.patel@example.com',
    city: 'Dallas',
    preferredCategories: ['nails', 'hair'],
    budgetMin: 45,
    budgetMax: 180,
  },
]

const barberPortfolio: PortfolioItem[] = [
  {
    id: 'p_barber_1',
    professionalId: 'pro_001',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
    price: 55,
    serviceTitle: 'Skin Fade + Beard Lineup',
    tags: ['fade', 'beard', 'precision'],
    category: 'barber',
  },
  {
    id: 'p_barber_2',
    professionalId: 'pro_001',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80',
    price: 45,
    serviceTitle: 'Classic Taper Cut',
    tags: ['taper', 'classic', 'clean'],
    category: 'barber',
  },
]

const hairPortfolio: PortfolioItem[] = [
  {
    id: 'p_hair_1',
    professionalId: 'pro_002',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    price: 180,
    serviceTitle: 'Balayage + Gloss',
    tags: ['balayage', 'color', 'dimensional'],
    category: 'hair',
  },
  {
    id: 'p_hair_2',
    professionalId: 'pro_002',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1523263685509-57c1d050d19b?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1595475038665-8f6c47c65d91?auto=format&fit=crop&w=800&q=80',
    price: 95,
    serviceTitle: 'Precision Bob + Blowout',
    tags: ['cut', 'blowout', 'modern'],
    category: 'hair',
  },
]

const nailsPortfolio: PortfolioItem[] = [
  {
    id: 'p_nails_1',
    professionalId: 'pro_003',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    price: 70,
    serviceTitle: 'Structured Gel Set',
    tags: ['gel', 'almond', 'longwear'],
    category: 'nails',
  },
  {
    id: 'p_nails_2',
    professionalId: 'pro_003',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1583241800698-91cfad0f0d62?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
    price: 85,
    serviceTitle: 'Chrome French Overlay',
    tags: ['french', 'chrome', 'detail'],
    category: 'nails',
  },
]

const makeupPortfolio: PortfolioItem[] = [
  {
    id: 'p_makeup_1',
    professionalId: 'pro_004',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=800&q=80',
    price: 140,
    serviceTitle: 'Soft Glam Event Look',
    tags: ['soft-glam', 'event', 'radiant'],
    category: 'makeup',
  },
  {
    id: 'p_makeup_2',
    professionalId: 'pro_004',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1545912452-8aea7e25a3d3?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=800&q=80',
    price: 175,
    serviceTitle: 'Bridal Trial + Lashes',
    tags: ['bridal', 'lashes', 'longwear'],
    category: 'makeup',
  },
]

export const professionalsSeed: Professional[] = [
  {
    id: 'pro_001',
    displayName: 'Andre Cuts',
    title: 'Master Barber',
    category: 'barber',
    city: 'Austin',
    rating: 4.9,
    reviewCount: 214,
    yearsExperience: 11,
    about: 'Fade specialist known for clean tapers and detailed beard shaping.',
    portfolioItems: barberPortfolio,
  },
  {
    id: 'pro_002',
    displayName: 'Luna Hale Studio',
    title: 'Colorist & Stylist',
    category: 'hair',
    city: 'Houston',
    rating: 4.8,
    reviewCount: 168,
    yearsExperience: 9,
    about: 'Dimensional color and editorial cuts with low-maintenance grow-out.',
    portfolioItems: hairPortfolio,
  },
  {
    id: 'pro_003',
    displayName: 'Nail Atelier by Rina',
    title: 'Nail Artist',
    category: 'nails',
    city: 'Dallas',
    rating: 4.9,
    reviewCount: 192,
    yearsExperience: 8,
    about: 'Structured gel sets and fine-line designs with luxury prep.',
    portfolioItems: nailsPortfolio,
  },
  {
    id: 'pro_004',
    displayName: 'Camille MUA',
    title: 'Makeup Artist',
    category: 'makeup',
    city: 'Houston',
    rating: 4.95,
    reviewCount: 143,
    yearsExperience: 10,
    about: 'Skin-first makeup for events, bridal sessions, and camera-ready looks.',
    portfolioItems: makeupPortfolio,
  },
]

export const requestsSeed: Request[] = [
  {
    id: 'req_001',
    userId: 'u_001',
    category: 'makeup',
    serviceTitle: 'Engagement Photo Makeup',
    budget: 160,
    preferredDate: '2026-04-18',
    notes: 'Natural finish, soft lashes, and warm-neutral palette.',
    status: 'matched',
  },
  {
    id: 'req_002',
    userId: 'u_002',
    category: 'barber',
    serviceTitle: 'Weekly Fade + Beard Cleanup',
    budget: 60,
    preferredDate: '2026-04-03',
    notes: 'Tight skin fade, keep beard length but sharpen cheek line.',
    status: 'pending',
  },
  {
    id: 'req_003',
    userId: 'u_003',
    category: 'nails',
    serviceTitle: 'Birthday Set',
    budget: 90,
    preferredDate: '2026-04-11',
    notes: 'Almond shape, chrome accents, medium length.',
    status: 'booked',
  },
]

export const savedItemsSeed: SavedItem[] = [
  {
    id: 'save_001',
    userId: 'u_001',
    professionalId: 'pro_004',
    savedAt: '2026-03-20T15:12:00Z',
    note: 'Top pick for engagement shoot.',
  },
  {
    id: 'save_002',
    userId: 'u_002',
    professionalId: 'pro_001',
    savedAt: '2026-03-25T09:04:00Z',
  },
  {
    id: 'save_003',
    userId: 'u_003',
    professionalId: 'pro_003',
    savedAt: '2026-03-28T19:45:00Z',
    note: 'Great line work in portfolio.',
  },
]

export const matchResultsSeed: MatchResult[] = [
  {
    id: 'mr_001',
    requestId: 'req_001',
    userId: 'u_001',
    professionalId: 'pro_004',
    score: 0.94,
    scoreLabel: '94% fit',
    reasons: [
      'Specializes in soft-glam event looks',
      'Within target budget range',
      'Consistently high repeat-client ratings',
    ],
  },
  {
    id: 'mr_002',
    requestId: 'req_002',
    userId: 'u_002',
    professionalId: 'pro_001',
    score: 0.91,
    scoreLabel: '91% fit',
    reasons: [
      'Portfolio strongly matches requested fade style',
      'Located in same city',
      'Price aligns with requested budget',
    ],
  },
  {
    id: 'mr_003',
    requestId: 'req_003',
    userId: 'u_003',
    professionalId: 'pro_003',
    score: 0.89,
    scoreLabel: '89% fit',
    reasons: [
      'Strong match on chrome and detail-heavy nail work',
      'Availability near preferred date',
      'High rating for longwear structure sets',
    ],
  },
]
