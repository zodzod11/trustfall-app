/*
 * =============================================================================
 * MIGRATION SUMMARY — Trustfall Row Level Security (comprehensive)
 * =============================================================================
 *
 * Prerequisites:
 *   • 20260330120000_initial_trustfall_core.sql
 *   • 20260330130000_trustfall_helpers_and_account_triggers.sql (optional)
 *
 * This migration:
 *   1. Adds professionals.owner_user_id — links a professional row to the auth
 *      user who may create/update it (required for pro-scoped policies).
 *   2. Drops prior RLS policies from the initial migration (replaced here).
 *   3. Creates conservative, named policies for anon + authenticated roles.
 *
 * Notes:
 *   • match_results INSERT/UPDATE: no policy for authenticated users — writes are
 *     performed by Edge Functions / workers using the service role, or by
 *     SECURITY DEFINER triggers/RPCs. The frontend never uses the service key.
 *   • contact_requests: recipient pros get SELECT only; status updates can be
 *     added later via a narrow RPC or additional policy with trigger guards.
 *   • Catalog rows with owner_user_id IS NULL remain readable when published;
 *     only service role or dashboard can assign owner or mutate unclaimed rows.
 *
 * =============================================================================
 */

-- -----------------------------------------------------------------------------
-- Schema: link professionals to auth (required for pro-owned RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.professionals.owner_user_id IS
  'Auth user who may manage this professional; NULL for seeded/unclaimed catalog rows.';

CREATE INDEX IF NOT EXISTS idx_professionals_owner_user_id
  ON public.professionals (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Drop policies from initial migration (by name)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

DROP POLICY IF EXISTS professionals_select_published ON public.professionals;

DROP POLICY IF EXISTS portfolio_items_select_published ON public.portfolio_items;

DROP POLICY IF EXISTS portfolio_item_tags_select_published ON public.portfolio_item_tags;

DROP POLICY IF EXISTS user_preferences_select_own ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_insert_own ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_update_own ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_delete_own ON public.user_preferences;

DROP POLICY IF EXISTS match_requests_select_own ON public.match_requests;
DROP POLICY IF EXISTS match_requests_insert_own ON public.match_requests;
DROP POLICY IF EXISTS match_requests_update_own ON public.match_requests;
DROP POLICY IF EXISTS match_requests_delete_own ON public.match_requests;

DROP POLICY IF EXISTS match_results_select_own ON public.match_results;

DROP POLICY IF EXISTS saved_portfolios_select_own ON public.saved_portfolios;
DROP POLICY IF EXISTS saved_portfolios_insert_own ON public.saved_portfolios;
DROP POLICY IF EXISTS saved_portfolios_delete_own ON public.saved_portfolios;

DROP POLICY IF EXISTS contact_requests_select_own ON public.contact_requests;
DROP POLICY IF EXISTS contact_requests_insert_own ON public.contact_requests;
DROP POLICY IF EXISTS contact_requests_update_own ON public.contact_requests;

-- -----------------------------------------------------------------------------
-- Ensure RLS is enabled (idempotent)
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

-- =============================================================================
-- profiles: clients and pros — read/update own row (id = auth.uid())
-- =============================================================================

COMMENT ON TABLE public.profiles IS
  'RLS: users (including account_type professional) may SELECT/UPDATE only where id = auth.uid().';

-- Allow self-read (clients and pros).
CREATE POLICY profiles_select_self
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Rare manual insert if signup trigger did not run (recovery flows).
CREATE POLICY profiles_insert_self
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_self
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- professionals: public discovery + owner full access
-- =============================================================================

COMMENT ON TABLE public.professionals IS
  'RLS: anon/authenticated SELECT published rows; owners SELECT/INSERT/UPDATE/DELETE own row via owner_user_id.';

-- Public discovery (anon + authenticated Supabase roles): published catalog for Explore.
CREATE POLICY professionals_select_published_for_discovery
  ON public.professionals
  FOR SELECT
  TO PUBLIC
  USING (published = true);

-- Authenticated: owners see their row even if unpublished.
CREATE POLICY professionals_select_owned_unpublished
  ON public.professionals
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY professionals_insert_owner_sets_self
  ON public.professionals
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY professionals_update_owned
  ON public.professionals
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY professionals_delete_owned
  ON public.professionals
  FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- =============================================================================
-- portfolio_items: public published + owner manages all items for their pro
-- =============================================================================

COMMENT ON TABLE public.portfolio_items IS
  'RLS: discovery reads published items; owners manage items where professionals.owner_user_id = auth.uid().';

CREATE POLICY portfolio_items_select_published_for_discovery
  ON public.portfolio_items
  FOR SELECT
  TO PUBLIC
  USING (
    published = true
    AND EXISTS (
      SELECT 1
      FROM public.professionals p
      WHERE p.id = portfolio_items.professional_id
        AND p.published = true
    )
  );

CREATE POLICY portfolio_items_select_owned_including_unpublished
  ON public.portfolio_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.professionals pr
      WHERE pr.id = portfolio_items.professional_id
        AND pr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY portfolio_items_insert_for_owned_professional
  ON public.portfolio_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.professionals pr
      WHERE pr.id = portfolio_items.professional_id
        AND pr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY portfolio_items_update_owned
  ON public.portfolio_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.professionals pr
      WHERE pr.id = portfolio_items.professional_id
        AND pr.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.professionals pr
      WHERE pr.id = portfolio_items.professional_id
        AND pr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY portfolio_items_delete_owned
  ON public.portfolio_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.professionals pr
      WHERE pr.id = portfolio_items.professional_id
        AND pr.owner_user_id = auth.uid()
    )
  );

-- =============================================================================
-- portfolio_item_tags: discovery read + owner manages tags on owned items
-- =============================================================================

COMMENT ON TABLE public.portfolio_item_tags IS
  'RLS: read tags for published discovery items; mutate only for portfolio items owned by the user professional.';

CREATE POLICY portfolio_item_tags_select_for_discovery
  ON public.portfolio_item_tags
  FOR SELECT
  TO PUBLIC
  USING (
    EXISTS (
      SELECT 1
      FROM public.portfolio_items pi
      INNER JOIN public.professionals pr ON pr.id = pi.professional_id
      WHERE pi.id = portfolio_item_tags.portfolio_item_id
        AND pi.published = true
        AND pr.published = true
    )
  );

CREATE POLICY portfolio_item_tags_select_owned_items
  ON public.portfolio_item_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.portfolio_items pi
      INNER JOIN public.professionals pr ON pr.id = pi.professional_id
      WHERE pi.id = portfolio_item_tags.portfolio_item_id
        AND pr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY portfolio_item_tags_insert_owned
  ON public.portfolio_item_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.portfolio_items pi
      INNER JOIN public.professionals pr ON pr.id = pi.professional_id
      WHERE pi.id = portfolio_item_tags.portfolio_item_id
        AND pr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY portfolio_item_tags_delete_owned
  ON public.portfolio_item_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.portfolio_items pi
      INNER JOIN public.professionals pr ON pr.id = pi.professional_id
      WHERE pi.id = portfolio_item_tags.portfolio_item_id
        AND pr.owner_user_id = auth.uid()
    )
  );

-- =============================================================================
-- user_preferences: only owning user
-- =============================================================================

COMMENT ON TABLE public.user_preferences IS
  'RLS: full CRUD limited to user_id = auth.uid().';

CREATE POLICY user_preferences_select_own
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_preferences_insert_own
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_preferences_update_own
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_preferences_delete_own
  ON public.user_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- match_requests: owning user only
-- =============================================================================

COMMENT ON TABLE public.match_requests IS
  'RLS: users manage rows where user_id = auth.uid().';

CREATE POLICY match_requests_select_own
  ON public.match_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY match_requests_insert_own
  ON public.match_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY match_requests_update_own
  ON public.match_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY match_requests_delete_own
  ON public.match_requests
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- match_results: read-only for owning match_request user; writes via service/backend
-- =============================================================================

COMMENT ON TABLE public.match_results IS
  'RLS: SELECT for the user who owns the parent match_request. INSERT/UPDATE: no authenticated policy — use service role or SECURITY DEFINER from backend.';

CREATE POLICY match_results_select_for_match_owner
  ON public.match_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.match_requests mr
      WHERE mr.id = match_results.match_request_id
        AND mr.user_id = auth.uid()
    )
  );

-- =============================================================================
-- saved_portfolios: owning user
-- =============================================================================

COMMENT ON TABLE public.saved_portfolios IS
  'RLS: users manage favorites where user_id = auth.uid().';

CREATE POLICY saved_portfolios_select_own
  ON public.saved_portfolios
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY saved_portfolios_insert_own
  ON public.saved_portfolios
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_portfolios_delete_own
  ON public.saved_portfolios
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- contact_requests: sender manages own; recipient pro can read
-- =============================================================================

COMMENT ON TABLE public.contact_requests IS
  'RLS: senders CRUD own rows; recipient professional (owner_user_id) can SELECT incoming.';

CREATE POLICY contact_requests_select_as_sender
  ON public.contact_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY contact_requests_select_as_recipient_pro
  ON public.contact_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.professionals pr
      WHERE pr.id = contact_requests.professional_id
        AND pr.owner_user_id = auth.uid()
    )
  );

CREATE POLICY contact_requests_insert_as_sender
  ON public.contact_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY contact_requests_update_as_sender
  ON public.contact_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY contact_requests_delete_as_sender
  ON public.contact_requests
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
