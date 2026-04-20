/*
 * Hosted-safe public catalog seed for the current Trustfall Supabase project.
 *
 * Use this in the Supabase dashboard SQL editor for the hosted project that the app
 * points at when you only want the 4 public professionals + 8 public portfolio items
 * + tags, without the newer columns that may not exist yet on the hosted schema.
 *
 * This file intentionally avoids:
 * - professionals.request_count
 * - portfolio_items.service_type
 * - portfolio_items.duration_minutes
 * - portfolio_items.description
 * - auth.users / auth.identities inserts
 */

BEGIN;

INSERT INTO public.professionals (
  id,
  slug,
  display_name,
  title,
  category,
  city,
  rating,
  review_count,
  years_experience,
  about,
  booking_phone,
  booking_email,
  published
) VALUES
  (
    'a1111111-1111-1111-1111-111111111101',
    'andre-cuts',
    'Andre Cuts',
    'Cuts, fades & beard shaping',
    'hair',
    'Austin',
    4.90,
    214,
    11,
    'Fade specialist for clean tapers, detailed beard shaping, and precision cuts.',
    '+16177550418',
    'zodzod11@gmail.com',
    true
  ),
  (
    'a1111111-1111-1111-1111-111111111102',
    'luna-hale-studio',
    'Luna Hale Studio',
    'Colorist & Stylist',
    'hair',
    'Houston',
    4.80,
    168,
    9,
    'Dimensional color and editorial cuts with low-maintenance grow-out.',
    '+17135550182',
    NULL,
    true
  ),
  (
    'a1111111-1111-1111-1111-111111111103',
    'nail-atelier-rina',
    'Nail Atelier by Rina',
    'Nail Artist',
    'nails',
    'Dallas',
    4.90,
    192,
    8,
    'Structured gel sets and fine-line designs with luxury prep.',
    '+12145550147',
    NULL,
    true
  ),
  (
    'a1111111-1111-1111-1111-111111111104',
    'northline-ink',
    'Northline Ink',
    'Tattoo Artist',
    'tattoo',
    'Houston',
    4.95,
    143,
    10,
    'Custom linework, botanicals, and Japanese-inspired pieces with a focus on flow and longevity.',
    '+17135550194',
    NULL,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  display_name = EXCLUDED.display_name,
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  city = EXCLUDED.city,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  years_experience = EXCLUDED.years_experience,
  about = EXCLUDED.about,
  booking_phone = EXCLUDED.booking_phone,
  booking_email = EXCLUDED.booking_email,
  published = EXCLUDED.published,
  updated_at = timezone('utc', now());

INSERT INTO public.portfolio_items (
  id,
  professional_id,
  service_title,
  category,
  price,
  before_image_path,
  after_image_path,
  sort_order,
  published
) VALUES
  (
    'b1111111-1111-1111-1111-111111111101',
    'a1111111-1111-1111-1111-111111111101',
    'Skin Fade + Beard Lineup',
    'hair',
    55.00,
    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
    0,
    true
  ),
  (
    'b1111111-1111-1111-1111-111111111102',
    'a1111111-1111-1111-1111-111111111101',
    'Classic Taper Cut',
    'hair',
    45.00,
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80',
    1,
    true
  ),
  (
    'b1111111-1111-1111-1111-111111111103',
    'a1111111-1111-1111-1111-111111111102',
    'Balayage + Gloss',
    'hair',
    180.00,
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    0,
    true
  ),
  (
    'b1111111-1111-1111-1111-111111111104',
    'a1111111-1111-1111-1111-111111111102',
    'Precision Bob + Blowout',
    'hair',
    95.00,
    'https://images.unsplash.com/photo-1523263685509-57c1d050d19b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80',
    1,
    true
  ),
  (
    'b1111111-1111-1111-1111-111111111105',
    'a1111111-1111-1111-1111-111111111103',
    'Structured Gel Set',
    'nails',
    70.00,
    'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    0,
    true
  ),
  (
    'b1111111-1111-1111-1111-111111111106',
    'a1111111-1111-1111-1111-111111111103',
    'Chrome French Overlay',
    'nails',
    85.00,
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
    1,
    true
  ),
  (
    'b1111111-1111-1111-1111-111111111107',
    'a1111111-1111-1111-1111-111111111104',
    'Fine-Line Florals + Lettering',
    'tattoo',
    140.00,
    'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80',
    'https://images.pexels.com/photos/1319459/pexels-photo-1319459.jpeg?auto=compress&cs=tinysrgb&w=800',
    0,
    true
  ),
  (
    'b1111111-1111-1111-1111-111111111108',
    'a1111111-1111-1111-1111-111111111104',
    'Japanese-Inspired Sleeve Session',
    'tattoo',
    175.00,
    'https://images.pexels.com/photos/6124258/pexels-photo-6124258.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    1,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  professional_id = EXCLUDED.professional_id,
  service_title = EXCLUDED.service_title,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  before_image_path = EXCLUDED.before_image_path,
  after_image_path = EXCLUDED.after_image_path,
  sort_order = EXCLUDED.sort_order,
  published = EXCLUDED.published,
  updated_at = timezone('utc', now());

DELETE FROM public.portfolio_item_tags
WHERE portfolio_item_id IN (
  'b1111111-1111-1111-1111-111111111101',
  'b1111111-1111-1111-1111-111111111102',
  'b1111111-1111-1111-1111-111111111103',
  'b1111111-1111-1111-1111-111111111104',
  'b1111111-1111-1111-1111-111111111105',
  'b1111111-1111-1111-1111-111111111106',
  'b1111111-1111-1111-1111-111111111107',
  'b1111111-1111-1111-1111-111111111108'
);

INSERT INTO public.portfolio_item_tags (portfolio_item_id, tag) VALUES
  ('b1111111-1111-1111-1111-111111111101', 'fade'),
  ('b1111111-1111-1111-1111-111111111101', 'beard'),
  ('b1111111-1111-1111-1111-111111111101', 'precision'),
  ('b1111111-1111-1111-1111-111111111102', 'taper'),
  ('b1111111-1111-1111-1111-111111111102', 'classic'),
  ('b1111111-1111-1111-1111-111111111102', 'clean'),
  ('b1111111-1111-1111-1111-111111111103', 'balayage'),
  ('b1111111-1111-1111-1111-111111111103', 'color'),
  ('b1111111-1111-1111-1111-111111111103', 'dimensional'),
  ('b1111111-1111-1111-1111-111111111104', 'cut'),
  ('b1111111-1111-1111-1111-111111111104', 'blowout'),
  ('b1111111-1111-1111-1111-111111111104', 'modern'),
  ('b1111111-1111-1111-1111-111111111105', 'gel'),
  ('b1111111-1111-1111-1111-111111111105', 'almond'),
  ('b1111111-1111-1111-1111-111111111105', 'longwear'),
  ('b1111111-1111-1111-1111-111111111106', 'french'),
  ('b1111111-1111-1111-1111-111111111106', 'chrome'),
  ('b1111111-1111-1111-1111-111111111106', 'detail'),
  ('b1111111-1111-1111-1111-111111111107', 'fine-line'),
  ('b1111111-1111-1111-1111-111111111107', 'floral'),
  ('b1111111-1111-1111-1111-111111111107', 'blackwork'),
  ('b1111111-1111-1111-1111-111111111108', 'japanese'),
  ('b1111111-1111-1111-1111-111111111108', 'sleeve'),
  ('b1111111-1111-1111-1111-111111111108', 'color');

COMMIT;
