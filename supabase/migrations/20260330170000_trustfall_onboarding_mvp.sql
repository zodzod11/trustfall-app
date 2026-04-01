/*
 * Trustfall — onboarding MVP (documentation + no structural churn)
 * =================================================================
 *
 * The initial core migration (20260330120000) already defines everything needed:
 *   • public.profiles — display_name, city, created_at, updated_at
 *   • public.user_preferences — onboarding_completed_at, preferred_categories,
 *     extra (jsonb), created_at, updated_at
 *
 * This migration adds COMMENTs so client apps and DBAs know how onboarding maps
 * to columns. No new tables, columns, or RLS changes are required for MVP.
 *
 * Onboarding flow fields (app): firstName, categories[], styleTags[],
 * inspirationFileName, location, contactPreference
 * ------------------------------------------------------------------------- */

-- -----------------------------------------------------------------------------
-- profiles: identity + queryable location for the signed-in client
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN public.profiles.display_name IS
  'Friendly name; client onboarding maps firstName here (trimmed). May be overwritten later in settings.';

COMMENT ON COLUMN public.profiles.city IS
  'Primary city or neighborhood string from onboarding location step; free text for MVP.';

COMMENT ON COLUMN public.profiles.created_at IS
  'UTC time the profile row was created (often from auth signup trigger).';

COMMENT ON COLUMN public.profiles.updated_at IS
  'UTC time of last profile update; maintained by trg_profiles_set_updated_at.';

-- -----------------------------------------------------------------------------
-- user_preferences: completion flag, category prefs, JSON for the rest
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN public.user_preferences.user_id IS
  'Primary key = auth.users id; one preferences row per signed-in user.';

COMMENT ON COLUMN public.user_preferences.onboarding_completed_at IS
  'NULL = user has not finished Trustfall onboarding; non-NULL ISO timestamp = completed. Replaces device-local-only flags.';

COMMENT ON COLUMN public.user_preferences.preferred_categories IS
  'Service categories from onboarding (e.g. barber, hair, nails, makeup); text[] aligned with app ServiceCategory.';

COMMENT ON COLUMN public.user_preferences.extra IS
  'JSON payload for onboarding-only fields not worth first-class columns yet. MVP keys (all optional): '
  '"style_tags" (json array of strings), '
  '"contact_preference" (string: text | call | email), '
  '"inspiration_file_name" (string; filename metadata only until Storage upload exists). '
  'Other features may add keys; clients should merge, not replace the whole object blindly.';

COMMENT ON COLUMN public.user_preferences.created_at IS
  'UTC time the preferences row was first inserted.';

COMMENT ON COLUMN public.user_preferences.updated_at IS
  'UTC time of last preferences update; maintained by trg_user_preferences_set_updated_at.';

COMMENT ON TABLE public.user_preferences IS
  'Per-user prefs keyed by auth user: onboarding completion timestamp, preferred_categories from onboarding, '
  'and extra jsonb for style tags, contact preference, and inspiration filename (MVP metadata).';
