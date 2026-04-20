-- Curated client request volume for pro storefront (match/contact), separate from review_count.
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS request_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.professionals.request_count IS
  'Count of client requests surfaced for social proof on pro profile; curated or aggregated.';
