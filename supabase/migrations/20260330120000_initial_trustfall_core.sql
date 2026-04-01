/*
 * =============================================================================
 * MIGRATION SUMMARY — Trustfall initial core schema
 * =============================================================================
 *
 * Creates the foundational Trustfall backend for Supabase (Postgres 15+):
 *
 *   • profiles              — App profile per auth user (replaces demo usersSeed)
 *   • professionals       — Pro directory (replaces professionalsSeed)
 *   • portfolio_items       — Looks / services under each professional
 *   • portfolio_item_tags   — Normalized tags per portfolio item (search + matching)
 *   • user_preferences      — Onboarding + misc prefs (optional per-user row)
 *   • match_requests        — Persisted match wizard (replaces route state / draft context)
 *   • match_results         — Server-side ranking output (pending/ready/failed + payload)
 *   • saved_portfolios      — User-saved portfolio items (favorites)
 *   • contact_requests      — Client → pro booking/contact messages (replaces local requestSubmissions)
 *
 * Also includes:
 *   • updated_at triggers on applicable tables
 *   • handle_new_user() — inserts profiles row on auth.users signup
 *   • Row Level Security (RLS) with policies for client-safe access
 *   • Catalog read access for published professionals / portfolio (anonymous + authenticated)
 *
 * Storage buckets (portfolio, client_uploads) are NOT created here — add via Supabase
 * dashboard or a separate migration using storage.* APIs.
 *
 * =============================================================================
 */

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
-- gen_random_uuid() is built into PostgreSQL 13+ (Supabase default).

-- -----------------------------------------------------------------------------
-- Helper: maintain updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trustfall_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trustfall_set_updated_at() IS
  'Trigger helper: sets updated_at to UTC now() on UPDATE.';

-- -----------------------------------------------------------------------------
-- Table: profiles
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  phone text,
  city text,
  budget_min numeric(12, 2),
  budget_max numeric(12, 2),
  avatar_url text,
  account_type text NOT NULL DEFAULT 'client',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT profiles_account_type_check CHECK (
    account_type IN ('client', 'professional', 'admin')
  )
);

COMMENT ON TABLE public.profiles IS
  'One app profile per Supabase Auth user; PII and display fields for Trustfall clients/pros.';

COMMENT ON COLUMN public.profiles.account_type IS
  'client = end user; professional = pro-facing account (future); admin = internal.';

CREATE INDEX idx_profiles_account_type ON public.profiles (account_type);

CREATE TRIGGER trg_profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.trustfall_set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper: create profile when a new auth user signs up (requires profiles table)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trustfall_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, account_type)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(COALESCE(new.email, ''), '@', 1),
      'User'
    ),
    'client'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.trustfall_handle_new_user() IS
  'On auth.users insert: creates public.profiles row with default account_type client.';

-- -----------------------------------------------------------------------------
-- Table: professionals
-- -----------------------------------------------------------------------------
CREATE TABLE public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  display_name text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  city text NOT NULL,
  rating numeric(3, 2),
  review_count integer NOT NULL DEFAULT 0,
  years_experience integer,
  about text,
  booking_phone text,
  booking_email text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT professionals_slug_lower CHECK (slug = lower(slug))
);

COMMENT ON TABLE public.professionals IS
  'Directory of professionals shown in Explore and match results; catalog is curated or pro-owned.';

COMMENT ON COLUMN public.professionals.slug IS 'URL-safe unique slug; stored lowercased.';

CREATE UNIQUE INDEX uq_professionals_slug ON public.professionals (slug);

CREATE INDEX idx_professionals_published ON public.professionals (published)
  WHERE published = true;

CREATE INDEX idx_professionals_city ON public.professionals (city);

CREATE INDEX idx_professionals_category ON public.professionals (category);

CREATE TRIGGER trg_professionals_set_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE PROCEDURE public.trustfall_set_updated_at();

-- -----------------------------------------------------------------------------
-- Table: portfolio_items
-- -----------------------------------------------------------------------------
CREATE TABLE public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals (id) ON DELETE CASCADE,
  service_title text NOT NULL,
  category text NOT NULL,
  price numeric(12, 2),
  before_image_path text,
  after_image_path text,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.portfolio_items IS
  'Individual looks / services; image paths point to Storage bucket (e.g. portfolio/).';

CREATE INDEX idx_portfolio_items_professional_id ON public.portfolio_items (professional_id);

CREATE INDEX idx_portfolio_items_prof_sort ON public.portfolio_items (professional_id, sort_order);

CREATE INDEX idx_portfolio_items_published ON public.portfolio_items (published)
  WHERE published = true;

CREATE TRIGGER trg_portfolio_items_set_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.trustfall_set_updated_at();

-- -----------------------------------------------------------------------------
-- Table: portfolio_item_tags
-- -----------------------------------------------------------------------------
CREATE TABLE public.portfolio_item_tags (
  portfolio_item_id uuid NOT NULL REFERENCES public.portfolio_items (id) ON DELETE CASCADE,
  tag text NOT NULL,
  PRIMARY KEY (portfolio_item_id, tag),
  CONSTRAINT portfolio_item_tags_tag_trim CHECK (tag = trim(tag)),
  CONSTRAINT portfolio_item_tags_tag_nonempty CHECK (length(tag) > 0)
);

COMMENT ON TABLE public.portfolio_item_tags IS
  'Many-to-many style tags per portfolio item for filters and ranking inputs.';

CREATE INDEX idx_portfolio_item_tags_tag ON public.portfolio_item_tags (tag);

-- -----------------------------------------------------------------------------
-- Table: user_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  onboarding_completed_at timestamptz,
  preferred_categories text[] NOT NULL DEFAULT '{}',
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.user_preferences IS
  'Optional per-user prefs: onboarding completion, categories, free-form extra JSON.';

COMMENT ON COLUMN public.user_preferences.extra IS
  'Flexible key/value payload (style tags, contact prefs) without schema churn.';

CREATE TRIGGER trg_user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE public.trustfall_set_updated_at();

-- -----------------------------------------------------------------------------
-- Table: match_requests
-- -----------------------------------------------------------------------------
CREATE TABLE public.match_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  category text,
  location_text text,
  tags text[] NOT NULL DEFAULT '{}',
  vision_notes text,
  inspiration_image_path text,
  current_photo_path text,
  saved_look_portfolio_item_id uuid REFERENCES public.portfolio_items (id) ON DELETE SET NULL,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_requests_status_check CHECK (
    status IN ('draft', 'submitted', 'cancelled')
  )
);

COMMENT ON TABLE public.match_requests IS
  'Persisted match wizard; replaces SPA route state and in-memory MatchDraftContext.';

COMMENT ON COLUMN public.match_requests.inspiration_image_path IS
  'Private Storage path under client_uploads/ for user inspiration image.';

COMMENT ON COLUMN public.match_requests.current_photo_path IS
  'Private Storage path under client_uploads/ for user current-state photo.';

CREATE INDEX idx_match_requests_user_created ON public.match_requests (user_id, created_at DESC);

CREATE INDEX idx_match_requests_user_status ON public.match_requests (user_id, status);

CREATE INDEX idx_match_requests_submitted ON public.match_requests (submitted_at)
  WHERE status = 'submitted';

CREATE TRIGGER trg_match_requests_set_updated_at
  BEFORE UPDATE ON public.match_requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.trustfall_set_updated_at();

-- -----------------------------------------------------------------------------
-- Table: match_results
-- -----------------------------------------------------------------------------
CREATE TABLE public.match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_request_id uuid NOT NULL REFERENCES public.match_requests (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  ranker_version text NOT NULL DEFAULT 'v1',
  error_message text,
  generated_at timestamptz,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_results_status_check CHECK (
    status IN ('pending', 'ready', 'failed')
  ),
  CONSTRAINT match_results_one_per_request UNIQUE (match_request_id)
);

COMMENT ON TABLE public.match_results IS
  'Server-side match output for a submitted match_request; payload JSON mirrors app ranking shape.';

COMMENT ON COLUMN public.match_results.payload IS
  'Ranked pros / pieces / scores; written by Edge Function or worker with service role.';

CREATE INDEX idx_match_results_status ON public.match_results (status);

CREATE TRIGGER trg_match_results_set_updated_at
  BEFORE UPDATE ON public.match_results
  FOR EACH ROW
  EXECUTE PROCEDURE public.trustfall_set_updated_at();

-- -----------------------------------------------------------------------------
-- Table: saved_portfolios
-- -----------------------------------------------------------------------------
CREATE TABLE public.saved_portfolios (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  portfolio_item_id uuid NOT NULL REFERENCES public.portfolio_items (id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, portfolio_item_id)
);

COMMENT ON TABLE public.saved_portfolios IS
  'User-saved portfolio items (favorite looks); replaces local savedPortfolioItemIds.';

CREATE INDEX idx_saved_portfolios_portfolio_item_id ON public.saved_portfolios (portfolio_item_id);

-- -----------------------------------------------------------------------------
-- Table: contact_requests
-- -----------------------------------------------------------------------------
CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals (id) ON DELETE RESTRICT,
  portfolio_item_id uuid NOT NULL REFERENCES public.portfolio_items (id) ON DELETE RESTRICT,
  message text NOT NULL,
  preferred_date_text text,
  client_name text,
  client_email text,
  client_phone text,
  pro_look_snapshot_path text,
  inspiration_image_path text,
  current_photo_path text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT contact_requests_status_check CHECK (
    status IN ('pending', 'viewed', 'declined', 'accepted', 'cancelled')
  )
);

COMMENT ON TABLE public.contact_requests IS
  'Client contact / booking messages to a professional for a specific look; replaces local requestSubmissions.';

CREATE INDEX idx_contact_requests_user_created ON public.contact_requests (user_id, created_at DESC);

CREATE INDEX idx_contact_requests_professional_created ON public.contact_requests (
  professional_id,
  created_at DESC
);

CREATE INDEX idx_contact_requests_status ON public.contact_requests (status);

CREATE TRIGGER trg_contact_requests_set_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.trustfall_set_updated_at();

-- -----------------------------------------------------------------------------
-- Auth trigger: new user → profile
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.trustfall_handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- profiles: users read/update own row
CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- professionals: published rows readable by anyone with a valid JWT or anon (Explore)
CREATE POLICY professionals_select_published
  ON public.professionals FOR SELECT
  USING (published = true);

-- portfolio_items: published rows readable when parent is published (redundant safety)
CREATE POLICY portfolio_items_select_published
  ON public.portfolio_items FOR SELECT
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.id = portfolio_items.professional_id
      AND p.published = true
    )
  );

-- portfolio_item_tags: visible for published portfolio items
CREATE POLICY portfolio_item_tags_select_published
  ON public.portfolio_item_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_items pi
      INNER JOIN public.professionals pr ON pr.id = pi.professional_id
      WHERE pi.id = portfolio_item_tags.portfolio_item_id
      AND pi.published = true
      AND pr.published = true
    )
  );

-- user_preferences: own row only
CREATE POLICY user_preferences_select_own
  ON public.user_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY user_preferences_insert_own
  ON public.user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_preferences_update_own
  ON public.user_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_preferences_delete_own
  ON public.user_preferences FOR DELETE
  USING (user_id = auth.uid());

-- match_requests: own rows
CREATE POLICY match_requests_select_own
  ON public.match_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY match_requests_insert_own
  ON public.match_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY match_requests_update_own
  ON public.match_requests FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY match_requests_delete_own
  ON public.match_requests FOR DELETE
  USING (user_id = auth.uid());

-- match_results: read-only for owning user (writes via service role / Edge)
CREATE POLICY match_results_select_own
  ON public.match_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.match_requests mr
      WHERE mr.id = match_results.match_request_id
      AND mr.user_id = auth.uid()
    )
  );

-- saved_portfolios: own rows
CREATE POLICY saved_portfolios_select_own
  ON public.saved_portfolios FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY saved_portfolios_insert_own
  ON public.saved_portfolios FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_portfolios_delete_own
  ON public.saved_portfolios FOR DELETE
  USING (user_id = auth.uid());

-- contact_requests: clients see own submissions
CREATE POLICY contact_requests_select_own
  ON public.contact_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY contact_requests_insert_own
  ON public.contact_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY contact_requests_update_own
  ON public.contact_requests FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

/*
 * NOTE: Inserts/updates to professionals, portfolio_items, portfolio_item_tags,
 *       and match_results are intended for service_role (dashboard, Edge Functions,
 *       or backend workers). No INSERT/UPDATE policies for authenticated users —
 *       those roles bypass RLS when using the service key.
 *
 * NOTE: When professional accounts log in, add policies or a professional_id
 *       link on profiles to allow SELECT/UPDATE on their rows and contact_requests
 *       WHERE professional_id = ...
 */
