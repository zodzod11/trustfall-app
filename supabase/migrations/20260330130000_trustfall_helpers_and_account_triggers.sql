/*
 * =============================================================================
 * MIGRATION SUMMARY — Trustfall helper functions & account triggers
 * =============================================================================
 *
 * Prerequisites: apply 20260330120000_initial_trustfall_core.sql first.
 *
 * This migration ADDS (does not redefine trustfall_set_updated_at):
 *
 *   • trustfall_display_name_from_auth_payload — pure helper for display names
 *   • trustfall_ensure_profile_for_user — idempotent profile row (service/internal)
 *   • trustfall_ensure_user_preferences_for_user — idempotent prefs row
 *   • trustfall_ensure_account_defaults — RPC for current user (client-safe)
 *   • trustfall_handle_new_user — CREATE OR REPLACE: delegates to ensure_profile_for_user
 *   • trustfall_after_profile_insert_user_preferences — AFTER INSERT on profiles → user_preferences
 *
 * Existing BEFORE UPDATE triggers from the initial migration are unchanged.
 * =============================================================================
 */

-- -----------------------------------------------------------------------------
-- Pure helper: derive display name from auth metadata + email (no table access)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trustfall_display_name_from_auth_payload(
  p_raw_user_meta_data jsonb,
  p_email text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(trim(p_raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(p_raw_user_meta_data->>'name'), ''),
    NULLIF(trim(split_part(COALESCE(p_email, ''), '@', 1)), ''),
    'User'
  );
$$;

COMMENT ON FUNCTION public.trustfall_display_name_from_auth_payload(jsonb, text) IS
  'Shared display-name logic for profile bootstrap (matches Auth user metadata conventions).';

-- -----------------------------------------------------------------------------
-- Internal: ensure profiles row exists for a user (idempotent)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trustfall_ensure_profile_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_raw jsonb;
  v_name text;
BEGIN
  SELECT u.email, u.raw_user_meta_data
  INTO v_email, v_raw
  FROM auth.users AS u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auth user not found: %', p_user_id;
  END IF;

  v_name := public.trustfall_display_name_from_auth_payload(v_raw, v_email);

  INSERT INTO public.profiles (id, display_name, account_type)
  VALUES (p_user_id, v_name, 'client')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.trustfall_ensure_profile_for_user(uuid) IS
  'SECURITY DEFINER: upsert profile for auth user. Restrict execution to service_role only.';

-- -----------------------------------------------------------------------------
-- Internal: ensure user_preferences row exists (idempotent)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trustfall_ensure_user_preferences_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.trustfall_ensure_user_preferences_for_user(uuid) IS
  'SECURITY DEFINER: create empty user_preferences row. Restrict execution to service_role only.';

-- -----------------------------------------------------------------------------
-- Client-safe RPC: ensure profile + user_preferences for the signed-in user
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trustfall_ensure_account_defaults()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  PERFORM public.trustfall_ensure_profile_for_user(v_uid);
  PERFORM public.trustfall_ensure_user_preferences_for_user(v_uid);
END;
$$;

COMMENT ON FUNCTION public.trustfall_ensure_account_defaults() IS
  'Call after sign-up or login to guarantee profile + user_preferences rows exist for auth.uid().';

-- -----------------------------------------------------------------------------
-- Refactor: new auth user → profile (delegates to trustfall_ensure_profile_for_user)
-- Replaces body from initial migration without duplicating INSERT logic.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trustfall_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.trustfall_ensure_profile_for_user(NEW.id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trustfall_handle_new_user() IS
  'AFTER INSERT on auth.users: ensures public.profiles row via trustfall_ensure_profile_for_user.';

-- -----------------------------------------------------------------------------
-- AFTER INSERT on profiles: create empty user_preferences (complements signup flow)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trustfall_after_profile_insert_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trustfall_after_profile_insert_user_preferences() IS
  'Ensures user_preferences exists whenever a profile row is inserted (signup or backfill).';

DROP TRIGGER IF EXISTS trg_profiles_after_insert_user_preferences ON public.profiles;

CREATE TRIGGER trg_profiles_after_insert_user_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.trustfall_after_profile_insert_user_preferences();

-- -----------------------------------------------------------------------------
-- Grants: lock down internal helpers; expose safe RPC to authenticated clients
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.trustfall_ensure_profile_for_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trustfall_ensure_user_preferences_for_user(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.trustfall_ensure_profile_for_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.trustfall_ensure_user_preferences_for_user(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.trustfall_display_name_from_auth_payload(jsonb, text) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.trustfall_ensure_account_defaults() TO authenticated, service_role;
