/*
 * =============================================================================
 * MIGRATION SUMMARY — Trustfall Supabase Storage (buckets + RLS)
 * =============================================================================
 *
 * Buckets (all private at bucket level; access controlled via RLS on storage.objects):
 *   • portfolio        — Professional portfolio / before–after images (published readable)
 *   • client-uploads   — User inspiration + current-look photos (private, user-scoped)
 *   • avatars          — Profile avatars (private, user-scoped)
 *
 * Path conventions (object key = name in storage.objects, relative to bucket):
 *   • portfolio/{professional_id}/{portfolio_item_id}/{filename}
 *   • client-uploads/{user_id}/match-requests/{match_request_id}/inspiration|current.{ext}
 *   • client-uploads/{user_id}/contact-requests/{contact_request_id}/inspiration|current.{ext}
 *   • avatars/{user_id}/{filename}
 *
 * Aligns with public.professionals.owner_user_id for portfolio writes and auth.uid()
 * for private user folders.
 *
 * Prerequisites: public.professionals, public.portfolio_items, public.professionals.owner_user_id
 * =============================================================================
 */

-- -----------------------------------------------------------------------------
-- Buckets (idempotent)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'portfolio',
    'portfolio',
    false,
    52428800, -- 50 MiB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
  ),
  (
    'client-uploads',
    'client-uploads',
    false,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
  ),
  (
    'avatars',
    'avatars',
    false,
    8388608, -- 8 MiB
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Drop existing Trustfall storage policies (idempotent re-run)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS trustfall_avatars_select_own ON storage.objects;
DROP POLICY IF EXISTS trustfall_avatars_insert_own ON storage.objects;
DROP POLICY IF EXISTS trustfall_avatars_update_own ON storage.objects;
DROP POLICY IF EXISTS trustfall_avatars_delete_own ON storage.objects;

DROP POLICY IF EXISTS trustfall_client_uploads_select_own ON storage.objects;
DROP POLICY IF EXISTS trustfall_client_uploads_insert_own ON storage.objects;
DROP POLICY IF EXISTS trustfall_client_uploads_update_own ON storage.objects;
DROP POLICY IF EXISTS trustfall_client_uploads_delete_own ON storage.objects;

DROP POLICY IF EXISTS trustfall_portfolio_select_published ON storage.objects;
DROP POLICY IF EXISTS trustfall_portfolio_select_owned_drafts ON storage.objects;
DROP POLICY IF EXISTS trustfall_portfolio_insert_owned ON storage.objects;
DROP POLICY IF EXISTS trustfall_portfolio_update_owned ON storage.objects;
DROP POLICY IF EXISTS trustfall_portfolio_delete_owned ON storage.objects;

-- -----------------------------------------------------------------------------
-- avatars — only the owning user (first path segment = auth.uid())
-- Path: avatars/{user_id}/{filename}
-- -----------------------------------------------------------------------------

-- Avatars: read own
CREATE POLICY trustfall_avatars_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY trustfall_avatars_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY trustfall_avatars_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY trustfall_avatars_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- client-uploads — private user reference + current look (first segment = user id)
-- -----------------------------------------------------------------------------
CREATE POLICY trustfall_client_uploads_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY trustfall_client_uploads_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY trustfall_client_uploads_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'client-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY trustfall_client_uploads_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- portfolio — public read for published items; full manage for owning pro
-- -----------------------------------------------------------------------------

-- Anyone (including anon) can fetch images for published discovery.
CREATE POLICY trustfall_portfolio_select_published
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'portfolio'
    AND EXISTS (
      SELECT 1
      FROM public.portfolio_items pi
      INNER JOIN public.professionals pr ON pr.id = pi.professional_id
      WHERE pi.published = true
        AND pr.published = true
        AND split_part(name, '/', 1) = pi.professional_id::text
        AND split_part(name, '/', 2) = pi.id::text
    )
  );

-- Owning professional can read all objects under their professional_id prefix (incl. drafts).
CREATE POLICY trustfall_portfolio_select_owned_drafts
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND EXISTS (
      SELECT 1
      FROM public.professionals p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY trustfall_portfolio_insert_owned
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio'
    AND EXISTS (
      SELECT 1
      FROM public.professionals p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY trustfall_portfolio_update_owned
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND EXISTS (
      SELECT 1
      FROM public.professionals p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'portfolio'
    AND EXISTS (
      SELECT 1
      FROM public.professionals p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY trustfall_portfolio_delete_owned
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND EXISTS (
      SELECT 1
      FROM public.professionals p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.owner_user_id = auth.uid()
    )
  );
