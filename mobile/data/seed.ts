import type { PortfolioItem, Professional, User } from '@/types'

export const usersSeed: User[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111101',
    firstName: 'Maya',
    lastName: 'Johnson',
    email: 'maya.johnson@example.com',
    phone: '+17135550100',
    city: 'Houston',
    preferredCategories: ['hair', 'tattoo'],
    budgetMin: 85,
    budgetMax: 240,
  },
  {
    id: 'c1111111-1111-1111-1111-111111111102',
    firstName: 'Chris',
    lastName: 'Davis',
    email: 'chris.davis@example.com',
    city: 'Austin',
    preferredCategories: ['hair'],
    budgetMin: 35,
    budgetMax: 110,
  },
  {
    id: 'c1111111-1111-1111-1111-111111111103',
    firstName: 'Alina',
    lastName: 'Patel',
    email: 'alina.patel@example.com',
    city: 'Dallas',
    preferredCategories: ['nails', 'hair'],
    budgetMin: 45,
    budgetMax: 180,
  },
]

/** Andre Cuts — fades & tapers; stored as `hair` (same catalog as color/cut pros). */
const andreCutsPortfolio: PortfolioItem[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111101',
    professionalId: 'a1111111-1111-1111-1111-111111111101',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
    price: 55,
    serviceTitle: 'Skin Fade + Beard Lineup',
    serviceType: 'Barber cut',
    durationMinutes: 60,
    tags: ['fade', 'beard', 'precision'],
    category: 'hair',
    description:
      'Clipper and shear work for a mid drop fade, tight lineup, and beard carved to your jawline with a matte, natural finish.',
  },
  {
    id: 'b1111111-1111-1111-1111-111111111102',
    professionalId: 'a1111111-1111-1111-1111-111111111101',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80',
    price: 45,
    serviceTitle: 'Classic Taper Cut',
    serviceType: 'Taper cut',
    durationMinutes: 45,
    tags: ['taper', 'classic', 'clean'],
    category: 'hair',
    description:
      'Classic taper with weight on top, clean temple fade, and blended nape—finished with shear work for a neat everyday shape.',
  },
]

const hairPortfolio: PortfolioItem[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111103',
    professionalId: 'a1111111-1111-1111-1111-111111111102',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    price: 180,
    serviceTitle: 'Balayage + Gloss',
    serviceType: 'Color service',
    durationMinutes: 180,
    tags: ['balayage', 'color', 'dimensional'],
    category: 'hair',
    description:
      'Hand-painted ribbons of light with a glossing toner for shine and warmth control. Soft grow-out with dimensional depth.',
  },
  {
    id: 'b1111111-1111-1111-1111-111111111104',
    professionalId: 'a1111111-1111-1111-1111-111111111102',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1523263685509-57c1d050d19b?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80',
    price: 95,
    serviceTitle: 'Precision Bob + Blowout',
    serviceType: 'Cut and blowout',
    durationMinutes: 90,
    tags: ['cut', 'blowout', 'modern'],
    category: 'hair',
    description:
      'Precision one-length bob with subtle layering for movement, finished with a round-brush blowout for swing and polish.',
  },
]

const nailsPortfolio: PortfolioItem[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111105',
    professionalId: 'a1111111-1111-1111-1111-111111111103',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    price: 70,
    serviceTitle: 'Structured Gel Set',
    serviceType: 'Structured manicure',
    durationMinutes: 75,
    tags: ['gel', 'almond', 'longwear'],
    category: 'nails',
    description:
      'Structured gel on almond lengths with apex support for durability, clean architecture, and a high-gloss top coat.',
  },
  {
    id: 'b1111111-1111-1111-1111-111111111106',
    professionalId: 'a1111111-1111-1111-1111-111111111103',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
    price: 85,
    serviceTitle: 'Chrome French Overlay',
    serviceType: 'Nail art set',
    durationMinutes: 90,
    tags: ['french', 'chrome', 'detail'],
    category: 'nails',
    description:
      'Natural-length base with a crisp French curve and chrome powder on the tips for a mirror finish that still reads refined.',
  },
]

const tattooPortfolio: PortfolioItem[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111107',
    professionalId: 'a1111111-1111-1111-1111-111111111104',
    beforeImageUrl:
      'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80',
    afterImageUrl:
      'https://images.pexels.com/photos/1319459/pexels-photo-1319459.jpeg?auto=compress&cs=tinysrgb&w=800',
    price: 140,
    serviceTitle: 'Fine-Line Florals + Lettering',
    serviceType: 'Fine-line tattoo',
    durationMinutes: 150,
    tags: ['fine-line', 'floral', 'blackwork'],
    category: 'tattoo',
    description:
      'Fine-line florals and script with a single-needle approach for delicate weight; flow follows your anatomy.',
  },
  {
    id: 'b1111111-1111-1111-1111-111111111108',
    professionalId: 'a1111111-1111-1111-1111-111111111104',
    beforeImageUrl:
      'https://images.pexels.com/photos/6124258/pexels-photo-6124258.jpeg?auto=compress&cs=tinysrgb&w=800',
    afterImageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    price: 175,
    serviceTitle: 'Japanese-Inspired Sleeve Session',
    serviceType: 'Sleeve tattoo',
    durationMinutes: 240,
    tags: ['japanese', 'sleeve', 'color'],
    category: 'tattoo',
    description:
      'Japanese-inspired sleeve layout with bold negative space and flowing composition built for readability over time.',
  },
]

export const professionalsSeed: Professional[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111101',
    displayName: 'Andre Cuts',
    title: 'Cuts, fades & beard shaping',
    category: 'hair',
    city: 'Austin',
    rating: 4.9,
    reviewCount: 214,
    requestCount: 89,
    yearsExperience: 11,
    about: 'Fade specialist for clean tapers, detailed beard shaping, and precision cuts.',
    bookingPhone: '+16177550418',
    bookingEmail: 'zodzod11@gmail.com',
    portfolioItems: andreCutsPortfolio,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111102',
    displayName: 'Luna Hale Studio',
    title: 'Colorist & Stylist',
    category: 'hair',
    city: 'Houston',
    rating: 4.8,
    reviewCount: 168,
    requestCount: 62,
    yearsExperience: 9,
    about: 'Dimensional color and editorial cuts with low-maintenance grow-out.',
    bookingPhone: '+17135550182',
    portfolioItems: hairPortfolio,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111103',
    displayName: 'Nail Atelier by Rina',
    title: 'Nail Artist',
    category: 'nails',
    city: 'Dallas',
    rating: 4.9,
    reviewCount: 192,
    requestCount: 71,
    yearsExperience: 8,
    about: 'Structured gel sets and fine-line designs with luxury prep.',
    bookingPhone: '+12145550147',
    portfolioItems: nailsPortfolio,
  },
  {
    id: 'a1111111-1111-1111-1111-111111111104',
    displayName: 'Northline Ink',
    title: 'Tattoo Artist',
    category: 'tattoo',
    city: 'Houston',
    rating: 4.95,
    reviewCount: 143,
    requestCount: 54,
    yearsExperience: 10,
    about: 'Custom linework, botanicals, and Japanese-inspired pieces with a focus on flow and longevity.',
    bookingPhone: '+17135550194',
    portfolioItems: tattooPortfolio,
  },
]
