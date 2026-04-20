-- =============================================================================
-- saved_professionals — backend-backed saved providers
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.saved_professionals (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals (id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, professional_id)
);

COMMENT ON TABLE public.saved_professionals IS
  'User-saved professionals/providers; complements saved_portfolios for backend-first saved state.';

CREATE INDEX IF NOT EXISTS idx_saved_professionals_professional_id
  ON public.saved_professionals (professional_id);

ALTER TABLE public.saved_professionals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_professionals_select_own ON public.saved_professionals;
DROP POLICY IF EXISTS saved_professionals_insert_own ON public.saved_professionals;
DROP POLICY IF EXISTS saved_professionals_delete_own ON public.saved_professionals;

CREATE POLICY saved_professionals_select_own
  ON public.saved_professionals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY saved_professionals_insert_own
  ON public.saved_professionals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_professionals_delete_own
  ON public.saved_professionals
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
