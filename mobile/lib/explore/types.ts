/** Raw row from Supabase (snake_case, nested professionals + tags). */
export type PortfolioExploreDbRow = {
  id: string
  professional_id: string
  service_title: string
  category: string
  service_type?: string | null
  price: string | number | null
  duration_minutes?: number | null
  before_image_path: string | null
  after_image_path: string | null
  sort_order: number
  published: boolean
  description?: string | null
  professionals: {
    id: string
    slug: string
    display_name: string
    title: string
    city: string
    rating: string | number | null
    review_count: number
    /** Present after `20260415120000_professionals_request_count` migration. */
    request_count?: number
    years_experience: number | null
    about: string | null
    category: string
    booking_phone: string | null
    booking_email: string | null
    published: boolean
  }
  portfolio_item_tags: { tag: string }[] | null
}
