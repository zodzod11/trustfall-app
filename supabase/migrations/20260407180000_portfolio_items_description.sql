-- Optional copy for each look; surfaced on portfolio detail instead of only the pro bio.

ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.portfolio_items.description IS
  'Short description of this specific look or service for discovery detail views.';
