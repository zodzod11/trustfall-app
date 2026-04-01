/*
 * =============================================================================
 * MIGRATION — Get Matched flow: match_requests fields + match_result_rows
 * =============================================================================
 *
 * match_requests additions:
 *   • desired_style_text — primary “desired style” copy for rules-based matching
 *   • current_state_text — user’s current look / starting point
 *   • budget_min / budget_max — optional range (numeric, same scale as profiles)
 *
 * Existing columns already cover:
 *   • category — service type
 *   • location_text — location
 *   • inspiration_image_path / current_photo_path — storage keys or HTTPS URLs (no embeddings)
 *   • vision_notes — legacy combined notes; app may mirror into desired_style_text
 *
 * match_result_rows (new):
 *   • One row per ranked portfolio item for a parent match_results job
 *   • Stores professional_id, portfolio_item_id, rank, total_score, component_scores, reasons
 *
 * Writes to match_results / match_result_rows remain service_role or Edge (RLS unchanged).
 * =============================================================================
 */

-- -----------------------------------------------------------------------------
-- match_requests: Get Matched text + budget
-- -----------------------------------------------------------------------------
ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS desired_style_text text,
  ADD COLUMN IF NOT EXISTS current_state_text text,
  ADD COLUMN IF NOT EXISTS budget_min numeric(12, 2),
  ADD COLUMN IF NOT EXISTS budget_max numeric(12, 2);

COMMENT ON COLUMN public.match_requests.desired_style_text IS
  'User-described desired style (rules-based MVP; not embeddings).';

COMMENT ON COLUMN public.match_requests.current_state_text IS
  'User-described current hair/look state before the service.';

COMMENT ON COLUMN public.match_requests.budget_min IS
  'Optional budget lower bound for matching (same currency as profiles).';

COMMENT ON COLUMN public.match_requests.budget_max IS
  'Optional budget upper bound for matching.';

COMMENT ON COLUMN public.match_requests.vision_notes IS
  'Legacy free-form notes; prefer desired_style_text + current_state_text for new flows.';

COMMENT ON COLUMN public.match_requests.inspiration_image_path IS
  'Reference inspiration: Storage object key or HTTPS URL.';

COMMENT ON COLUMN public.match_requests.current_photo_path IS
  'Current look: Storage object key or HTTPS URL.';

-- -----------------------------------------------------------------------------
-- match_result_rows: ranked rows per match job (rules-based scores)
-- -----------------------------------------------------------------------------
CREATE TABLE public.match_result_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_result_id uuid NOT NULL REFERENCES public.match_results (id) ON DELETE CASCADE,
  rank integer NOT NULL,
  professional_id uuid NOT NULL REFERENCES public.professionals (id) ON DELETE RESTRICT,
  portfolio_item_id uuid NOT NULL REFERENCES public.portfolio_items (id) ON DELETE RESTRICT,
  total_score numeric(6, 2) NOT NULL,
  component_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasons text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_result_rows_rank_positive CHECK (rank > 0),
  CONSTRAINT match_result_rows_score_range CHECK (total_score >= 0::numeric AND total_score <= 100::numeric),
  CONSTRAINT match_result_rows_unique_rank UNIQUE (match_result_id, rank),
  CONSTRAINT match_result_rows_unique_item UNIQUE (match_result_id, portfolio_item_id)
);

COMMENT ON TABLE public.match_result_rows IS
  'Normalized ranked hits for a match_results job; one row per portfolio_item at a rank.';

COMMENT ON COLUMN public.match_result_rows.component_scores IS
  'Rules-based MVP breakdown, e.g. {"category":18,"location":12,"tags":12,"rating":14}.';

COMMENT ON COLUMN public.match_result_rows.reasons IS
  'Human-readable reasons for the rank, e.g. {"Category match","Near your location"}.';

CREATE INDEX idx_match_result_rows_match_result_id ON public.match_result_rows (match_result_id);

CREATE INDEX idx_match_result_rows_professional_id ON public.match_result_rows (professional_id);

CREATE INDEX idx_match_result_rows_portfolio_item_id ON public.match_result_rows (portfolio_item_id);

-- -----------------------------------------------------------------------------
-- RLS: match_result_rows — read-only for owning match_request user
-- -----------------------------------------------------------------------------
ALTER TABLE public.match_result_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_result_rows_select_for_match_owner
  ON public.match_result_rows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.match_results mr
      INNER JOIN public.match_requests mreq ON mreq.id = mr.match_request_id
      WHERE mr.id = match_result_rows.match_result_id
        AND mreq.user_id = auth.uid()
    )
  );

/*
 * INSERT/UPDATE/DELETE: no policy for authenticated — service_role / Edge Function only.
 */
