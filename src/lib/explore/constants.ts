/** PostgREST select for portfolio-first catalog (published items + published pros + tags). */
export const PORTFOLIO_EXPLORE_SELECT = `
  id,
  professional_id,
  service_title,
  category,
  price,
  before_image_path,
  after_image_path,
  sort_order,
  published,
  professionals!inner (
    id,
    slug,
    display_name,
    title,
    city,
    rating,
    review_count,
    years_experience,
    about,
    category,
    booking_phone,
    booking_email,
    published
  ),
  portfolio_item_tags (tag)
`.trim()

export const EXPLORE_PAGE_SIZE = 1000
