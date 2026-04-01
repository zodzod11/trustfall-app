/*
 * =============================================================================
 * Trustfall — local / staging seed data
 * =============================================================================
 *
 * Maps `src/data/seed.ts` (professionalsSeed + usersSeed) into:
 *   • professionals, portfolio_items, portfolio_item_tags
 *   • auth.users + auth.identities + profile/user_preferences updates (demo clients)
 *
 * Deterministic UUIDs (stable across re-seeds):
 *   Catalog professionals: a1111111-1111-1111-1111-11111111110x
 *   Catalog portfolio:     b1111111-1111-1111-1111-11111111110x
 *   Demo client users:     c1111111-1111-1111-1111-11111111110x
 *   Demo pro users:        e1111111-1111-1111-1111-11111111110x
 *   Owned professionals:   f1111111-1111-1111-1111-11111111110x
 *   Pro portfolio items:   f2111111-1111-1111-1111-11111111110x
 *   Match requests:        d1111111-1111-1111-1111-11111111110x
 *   Match results / rows:  d2111111… / d3111111…
 *
 * Image fields use full HTTPS URLs (same as the app seed) so Explore works without
 * uploading to Storage first.
 *
 * Run after migrations:
 *   supabase db reset
 *   # or:
 *   psql "$DATABASE_URL" -f supabase/seed.sql
 *
 * Password for demo users (email auth): TrustfallDemo#1
 * =============================================================================
 */

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Professionals (curated catalog — owner_user_id NULL = visible to everyone)
-- -----------------------------------------------------------------------------
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
  published,
  owner_user_id
) VALUES
  (
    'a1111111-1111-1111-1111-111111111101',
    'andre-cuts',
    'Andre Cuts',
    'Master Barber',
    'barber',
    'Austin',
    4.90,
    214,
    11,
    'Fade specialist known for clean tapers and detailed beard shaping.',
    '+16177550418',
    'zodzod11@gmail.com',
    true,
    NULL
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
    NULL,
    NULL,
    true,
    NULL
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
    NULL,
    NULL,
    true,
    NULL
  ),
  (
    'a1111111-1111-1111-1111-111111111104',
    'camille-mua',
    'Camille MUA',
    'Makeup Artist',
    'makeup',
    'Houston',
    4.95,
    143,
    10,
    'Skin-first makeup for events, bridal sessions, and camera-ready looks.',
    NULL,
    NULL,
    true,
    NULL
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
  owner_user_id = EXCLUDED.owner_user_id,
  updated_at = timezone('utc', now());

-- -----------------------------------------------------------------------------
-- 2) Portfolio items (before/after URLs match src/data/seed.ts)
-- -----------------------------------------------------------------------------
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
    'barber',
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
    'barber',
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
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
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
    'https://images.unsplash.com/photo-1595475038665-8f6c47c65d91?auto=format&fit=crop&w=800&q=80',
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
    'https://images.unsplash.com/photo-1583241800698-91cfad0f0d62?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
    1,
    true
  ),
  (
    'b1111111-1111-1111-1111-111111111107',
    'a1111111-1111-1111-1111-111111111104',
    'Soft Glam Event Look',
    'makeup',
    140.00,
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=800&q=80',
    0,
    true
  ),
  (
    'b1111111-1111-1111-1111-111111111108',
    'a1111111-1111-1111-1111-111111111104',
    'Bridal Trial + Lashes',
    'makeup',
    175.00,
    'https://images.unsplash.com/photo-1545912452-8aea7e25a3d3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=800&q=80',
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

-- -----------------------------------------------------------------------------
-- 3) Portfolio tags (normalized, lowercase)
-- -----------------------------------------------------------------------------
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
  ('b1111111-1111-1111-1111-111111111107', 'soft-glam'),
  ('b1111111-1111-1111-1111-111111111107', 'event'),
  ('b1111111-1111-1111-1111-111111111107', 'radiant'),
  ('b1111111-1111-1111-1111-111111111108', 'bridal'),
  ('b1111111-1111-1111-1111-111111111108', 'lashes'),
  ('b1111111-1111-1111-1111-111111111108', 'longwear')
ON CONFLICT (portfolio_item_id, tag) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4) Demo client users (auth) — enables profiles + user_preferences testing
--    Password: TrustfallDemo#1  (change in hosted projects)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  (
    'c1111111-1111-1111-1111-111111111101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'maya.johnson@example.com',
    crypt('TrustfallDemo#1', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maya Johnson"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  ),
  (
    'c1111111-1111-1111-1111-111111111102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'chris.davis@example.com',
    crypt('TrustfallDemo#1', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Chris Davis"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  ),
  (
    'c1111111-1111-1111-1111-111111111103',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alina.patel@example.com',
    crypt('TrustfallDemo#1', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alina Patel"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = timezone('utc', now());

-- Idempotent: remove prior email identities so re-seeding does not duplicate rows.
DELETE FROM auth.identities
WHERE user_id IN (
  'c1111111-1111-1111-1111-111111111101',
  'c1111111-1111-1111-1111-111111111102',
  'c1111111-1111-1111-1111-111111111103'
);

-- Email identities (required for password sign-in on current Supabase Auth)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111101',
    jsonb_build_object(
      'sub', 'c1111111-1111-1111-1111-111111111101',
      'email', 'maya.johnson@example.com',
      'email_verified', true
    ),
    'email',
    'maya.johnson@example.com',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111102',
    jsonb_build_object(
      'sub', 'c1111111-1111-1111-1111-111111111102',
      'email', 'chris.davis@example.com',
      'email_verified', true
    ),
    'email',
    'chris.davis@example.com',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111103',
    jsonb_build_object(
      'sub', 'c1111111-1111-1111-1111-111111111103',
      'email', 'alina.patel@example.com',
      'email_verified', true
    ),
    'email',
    'alina.patel@example.com',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  );

-- Profiles: trigger may have created rows — enrich from usersSeed
INSERT INTO public.profiles (id, display_name, account_type, phone, city, budget_min, budget_max)
VALUES
  ('c1111111-1111-1111-1111-111111111101', 'Maya Johnson', 'client', '+17135550100', 'Houston', 85.00, 240.00),
  ('c1111111-1111-1111-1111-111111111102', 'Chris Davis', 'client', NULL, 'Austin', 35.00, 110.00),
  ('c1111111-1111-1111-1111-111111111103', 'Alina Patel', 'client', NULL, 'Dallas', 45.00, 180.00)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  phone = EXCLUDED.phone,
  city = EXCLUDED.city,
  budget_min = EXCLUDED.budget_min,
  budget_max = EXCLUDED.budget_max,
  updated_at = timezone('utc', now());

INSERT INTO public.user_preferences (user_id, preferred_categories)
VALUES
  ('c1111111-1111-1111-1111-111111111101', ARRAY['hair', 'makeup']::text[]),
  ('c1111111-1111-1111-1111-111111111102', ARRAY['barber']::text[]),
  ('c1111111-1111-1111-1111-111111111103', ARRAY['nails', 'hair']::text[])
ON CONFLICT (user_id) DO UPDATE SET
  preferred_categories = EXCLUDED.preferred_categories,
  updated_at = timezone('utc', now());

-- -----------------------------------------------------------------------------
-- 5) Professional accounts (auth) — owner-linked catalog for onboarding tests
--    Password: TrustfallDemo#1
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  (
    'e1111111-1111-1111-1111-111111111101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'jordan.lee.pro@example.com',
    crypt('TrustfallDemo#1', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Jordan Lee"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  ),
  (
    'e1111111-1111-1111-1111-111111111102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sloane.meyer.pro@example.com',
    crypt('TrustfallDemo#1', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sloane Meyer"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = timezone('utc', now());

DELETE FROM auth.identities
WHERE user_id IN (
  'e1111111-1111-1111-1111-111111111101',
  'e1111111-1111-1111-1111-111111111102'
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    'e1111111-1111-1111-1111-111111111101',
    jsonb_build_object(
      'sub', 'e1111111-1111-1111-1111-111111111101',
      'email', 'jordan.lee.pro@example.com',
      'email_verified', true
    ),
    'email',
    'jordan.lee.pro@example.com',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    gen_random_uuid(),
    'e1111111-1111-1111-1111-111111111102',
    jsonb_build_object(
      'sub', 'e1111111-1111-1111-1111-111111111102',
      'email', 'sloane.meyer.pro@example.com',
      'email_verified', true
    ),
    'email',
    'sloane.meyer.pro@example.com',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  );

INSERT INTO public.profiles (id, display_name, account_type, phone, city, budget_min, budget_max)
VALUES
  (
    'e1111111-1111-1111-1111-111111111101',
    'Jordan Lee',
    'professional',
    '+17135550901',
    'Houston',
    NULL,
    NULL
  ),
  (
    'e1111111-1111-1111-1111-111111111102',
    'Sloane Meyer',
    'professional',
    NULL,
    'Austin',
    NULL,
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  account_type = EXCLUDED.account_type,
  phone = EXCLUDED.phone,
  city = EXCLUDED.city,
  updated_at = timezone('utc', now());

INSERT INTO public.user_preferences (user_id, preferred_categories)
VALUES
  ('e1111111-1111-1111-1111-111111111101', ARRAY['hair', 'color']::text[]),
  ('e1111111-1111-1111-1111-111111111102', ARRAY['barber', 'beard']::text[])
ON CONFLICT (user_id) DO UPDATE SET
  preferred_categories = EXCLUDED.preferred_categories,
  updated_at = timezone('utc', now());

-- -----------------------------------------------------------------------------
-- 6) Owned professional rows + portfolio (pro onboarding / Explore)
-- -----------------------------------------------------------------------------
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
  published,
  owner_user_id
) VALUES
  (
    'f1111111-1111-1111-1111-111111111101',
    'jordan-lee-studio',
    'Jordan Lee Studio',
    'Colorist & Extension Specialist',
    'hair',
    'Houston',
    4.88,
    96,
    7,
    'Lived-in color, seamless extensions, and healthy-hair-first formulation.',
    '+17135550901',
    'bookings@jordanleestudio.example.com',
    true,
    'e1111111-1111-1111-1111-111111111101'
  ),
  (
    'f1111111-1111-1111-1111-111111111102',
    'sloane-meyer-barber',
    'Sloane Meyer Barber',
    'Barber & Beard Artist',
    'barber',
    'Austin',
    4.92,
    132,
    9,
    'Texture-forward fades, crisp lineups, and tailored beard design.',
    '+15125550988',
    NULL,
    true,
    'e1111111-1111-1111-1111-111111111102'
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
  owner_user_id = EXCLUDED.owner_user_id,
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
    'f2111111-1111-1111-1111-111111111101',
    'f1111111-1111-1111-1111-111111111101',
    'Lived-In Brunette Balayage',
    'hair',
    195.00,
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    0,
    true
  ),
  (
    'f2111111-1111-1111-1111-111111111102',
    'f1111111-1111-1111-1111-111111111101',
    'Face-Framing Ribbon Lights',
    'hair',
    165.00,
    'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595475038665-8f6c47c65d91?auto=format&fit=crop&w=800&q=80',
    1,
    true
  ),
  (
    'f2111111-1111-1111-1111-111111111103',
    'f1111111-1111-1111-1111-111111111102',
    'Mid Fade With Natural Texture',
    'barber',
    48.00,
    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
    0,
    true
  ),
  (
    'f2111111-1111-1111-1111-111111111104',
    'f1111111-1111-1111-1111-111111111102',
    'Beard Sculpt & Lineup',
    'barber',
    38.00,
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80',
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

INSERT INTO public.portfolio_item_tags (portfolio_item_id, tag) VALUES
  ('f2111111-1111-1111-1111-111111111101', 'balayage'),
  ('f2111111-1111-1111-1111-111111111101', 'brunette'),
  ('f2111111-1111-1111-1111-111111111101', 'dimensional'),
  ('f2111111-1111-1111-1111-111111111101', 'lived-in'),
  ('f2111111-1111-1111-1111-111111111102', 'face-framing'),
  ('f2111111-1111-1111-1111-111111111102', 'highlights'),
  ('f2111111-1111-1111-1111-111111111102', 'ribbon'),
  ('f2111111-1111-1111-1111-111111111102', 'soft-blend'),
  ('f2111111-1111-1111-1111-111111111103', 'fade'),
  ('f2111111-1111-1111-1111-111111111103', 'texture'),
  ('f2111111-1111-1111-1111-111111111103', 'natural'),
  ('f2111111-1111-1111-1111-111111111104', 'beard'),
  ('f2111111-1111-1111-1111-111111111104', 'lineup'),
  ('f2111111-1111-1111-1111-111111111104', 'sculpt')
ON CONFLICT (portfolio_item_id, tag) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7) Sample match requests + precomputed match results (Get Matched QA)
-- -----------------------------------------------------------------------------
INSERT INTO public.match_requests (
  id,
  user_id,
  status,
  category,
  location_text,
  tags,
  vision_notes,
  desired_style_text,
  current_state_text,
  budget_min,
  budget_max,
  submitted_at
) VALUES
  (
    'd1111111-1111-1111-1111-111111111101',
    'c1111111-1111-1111-1111-111111111101',
    'submitted',
    'hair',
    'Houston, TX',
    ARRAY['balayage', 'dimensional', 'low-maintenance']::text[],
    'Want dimension without heavy upkeep.',
    'Lived-in brunette balayage with soft ribbons around the face; natural grow-out.',
    'Medium-length hair, some old box color on mids; open to gloss refresh.',
    100.00,
    220.00,
    timezone('utc', now())
  ),
  (
    'd1111111-1111-1111-1111-111111111102',
    'c1111111-1111-1111-1111-111111111102',
    'submitted',
    'barber',
    'Austin, TX',
    ARRAY['fade', 'texture', 'lineup']::text[],
    'Need a clean taper before an event.',
    'Mid taper fade with natural curl on top; sharp lineup and beard blend.',
    'Growing out a previous cut; sides need weight removed.',
    35.00,
    75.00,
    timezone('utc', now())
  )
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  status = EXCLUDED.status,
  category = EXCLUDED.category,
  location_text = EXCLUDED.location_text,
  tags = EXCLUDED.tags,
  vision_notes = EXCLUDED.vision_notes,
  desired_style_text = EXCLUDED.desired_style_text,
  current_state_text = EXCLUDED.current_state_text,
  budget_min = EXCLUDED.budget_min,
  budget_max = EXCLUDED.budget_max,
  submitted_at = EXCLUDED.submitted_at,
  updated_at = timezone('utc', now());

DELETE FROM public.match_result_rows
WHERE match_result_id IN (
  SELECT id FROM public.match_results WHERE match_request_id = 'd1111111-1111-1111-1111-111111111101'
);

DELETE FROM public.match_results
WHERE match_request_id = 'd1111111-1111-1111-1111-111111111101';

INSERT INTO public.match_results (
  id,
  match_request_id,
  status,
  ranker_version,
  error_message,
  generated_at,
  payload
) VALUES (
  'd2111111-1111-1111-1111-111111111101',
  'd1111111-1111-1111-1111-111111111101',
  'ready',
  'rules-mvp-1',
  NULL,
  timezone('utc', now()),
  '{"version":1,"ranker_version":"rules-mvp-1","generated_at":"2026-03-30T12:00:00.000Z","match_request_id":"d1111111-1111-1111-1111-111111111101","top":[{"rank":1,"portfolio_item_id":"f2111111-1111-1111-1111-111111111101","professional_id":"f1111111-1111-1111-1111-111111111101","total_score":91.2,"component_scores":{"serviceType":15,"styleTags":18,"desiredStyle":20,"budget":10,"location":10,"quality":8},"reasons":["Strong tag overlap with your brief","Same city as your search","Balayage-forward portfolio"]},{"rank":2,"portfolio_item_id":"b1111111-1111-1111-1111-111111111103","professional_id":"a1111111-1111-1111-1111-111111111102","total_score":86.5,"component_scores":{"serviceType":15,"styleTags":18,"desiredStyle":18,"budget":8,"location":10,"quality":8},"reasons":["Category match","Dimensional color specialist"]},{"rank":3,"portfolio_item_id":"f2111111-1111-1111-1111-111111111102","professional_id":"f1111111-1111-1111-1111-111111111101","total_score":84.0,"component_scores":{"serviceType":15,"styleTags":18,"desiredStyle":16,"budget":9,"location":10,"quality":8},"reasons":["Face-framing work aligned with your notes","Within typical budget range"]}]}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  match_request_id = EXCLUDED.match_request_id,
  status = EXCLUDED.status,
  ranker_version = EXCLUDED.ranker_version,
  error_message = EXCLUDED.error_message,
  generated_at = EXCLUDED.generated_at,
  payload = EXCLUDED.payload,
  updated_at = timezone('utc', now());

INSERT INTO public.match_result_rows (
  id,
  match_result_id,
  rank,
  professional_id,
  portfolio_item_id,
  total_score,
  component_scores,
  reasons
) VALUES
  (
    'd3111111-1111-1111-1111-111111111101',
    'd2111111-1111-1111-1111-111111111101',
    1,
    'f1111111-1111-1111-1111-111111111101',
    'f2111111-1111-1111-1111-111111111101',
    91.20,
    '{"serviceType":15,"styleTags":18,"desiredStyle":20,"budget":10,"location":10,"quality":8}'::jsonb,
    ARRAY[
      'Strong tag overlap with your brief',
      'Same city as your search',
      'Balayage-forward portfolio'
    ]::text[]
  ),
  (
    'd3111111-1111-1111-1111-111111111102',
    'd2111111-1111-1111-1111-111111111101',
    2,
    'a1111111-1111-1111-1111-111111111102',
    'b1111111-1111-1111-1111-111111111103',
    86.50,
    '{"serviceType":15,"styleTags":18,"desiredStyle":18,"budget":8,"location":10,"quality":8}'::jsonb,
    ARRAY['Category match', 'Dimensional color specialist']::text[]
  ),
  (
    'd3111111-1111-1111-1111-111111111103',
    'd2111111-1111-1111-1111-111111111101',
    3,
    'f1111111-1111-1111-1111-111111111101',
    'f2111111-1111-1111-1111-111111111102',
    84.00,
    '{"serviceType":15,"styleTags":18,"desiredStyle":16,"budget":9,"location":10,"quality":8}'::jsonb,
    ARRAY[
      'Face-framing work aligned with your notes',
      'Within typical budget range'
    ]::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  match_result_id = EXCLUDED.match_result_id,
  rank = EXCLUDED.rank,
  professional_id = EXCLUDED.professional_id,
  portfolio_item_id = EXCLUDED.portfolio_item_id,
  total_score = EXCLUDED.total_score,
  component_scores = EXCLUDED.component_scores,
  reasons = EXCLUDED.reasons;

COMMIT;
