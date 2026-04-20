-- =============================================================================
-- request system rebuild
-- Extends public.contact_requests into the shared user -> provider request/lead row.
-- =============================================================================

ALTER TABLE public.contact_requests
  ALTER COLUMN professional_id DROP NOT NULL,
  ALTER COLUMN portfolio_item_id DROP NOT NULL;

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS match_request_id uuid REFERENCES public.match_requests (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS provider_name_snapshot text,
  ADD COLUMN IF NOT EXISTS portfolio_title_snapshot text,
  ADD COLUMN IF NOT EXISTS category_snapshot text,
  ADD COLUMN IF NOT EXISTS portfolio_image_url_snapshot text,
  ADD COLUMN IF NOT EXISTS provider_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_channels text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS notification_error text;

UPDATE public.contact_requests
SET status = CASE status
  WHEN 'pending' THEN 'submitted'
  WHEN 'accepted' THEN 'responded'
  WHEN 'declined' THEN 'closed'
  ELSE status
END
WHERE status IN ('pending', 'accepted', 'declined');

UPDATE public.contact_requests cr
SET provider_name_snapshot = pr.display_name
FROM public.professionals pr
WHERE cr.professional_id = pr.id
  AND cr.provider_name_snapshot IS NULL;

UPDATE public.contact_requests cr
SET portfolio_title_snapshot = pi.service_title,
    category_snapshot = pi.category
FROM public.portfolio_items pi
WHERE cr.portfolio_item_id = pi.id
  AND (cr.portfolio_title_snapshot IS NULL OR cr.category_snapshot IS NULL);

ALTER TABLE public.contact_requests
  DROP CONSTRAINT IF EXISTS contact_requests_status_check;

ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_status_check CHECK (
    status IN ('submitted', 'notified', 'viewed', 'responded', 'closed', 'cancelled')
  );

CREATE INDEX IF NOT EXISTS idx_contact_requests_match_request_id
  ON public.contact_requests (match_request_id);

COMMENT ON TABLE public.contact_requests IS
  'Unified user-to-provider request / lead rows for direct outreach and match-driven requests.';

COMMENT ON COLUMN public.contact_requests.request_type IS
  'Request origin/type. direct = browse/detail outreach, match = request sent from match results.';

COMMENT ON COLUMN public.contact_requests.provider_name_snapshot IS
  'Provider display name captured at submit time so history/detail still render if catalog linkage is missing.';

COMMENT ON COLUMN public.contact_requests.portfolio_title_snapshot IS
  'Selected service/look title captured at submit time.';

COMMENT ON COLUMN public.contact_requests.category_snapshot IS
  'Category captured at submit time for history/detail and future analytics.';

COMMENT ON COLUMN public.contact_requests.portfolio_image_url_snapshot IS
  'Selected look preview URL captured at submit time for request history/detail.';

COMMENT ON COLUMN public.contact_requests.provider_notified_at IS
  'Timestamp when provider notification was successfully sent.';

COMMENT ON COLUMN public.contact_requests.notified_channels IS
  'Notification channels successfully used for the provider, e.g. sms/email.';

COMMENT ON COLUMN public.contact_requests.notification_error IS
  'Latest provider notification warning/error captured after persistence.';
