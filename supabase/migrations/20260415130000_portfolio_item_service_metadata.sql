ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

COMMENT ON COLUMN public.portfolio_items.service_type IS
  'Consumer-facing service grouping for a portfolio item, such as haircut or nail art.';

COMMENT ON COLUMN public.portfolio_items.duration_minutes IS
  'Optional service duration in minutes for booking and storefront display.';
