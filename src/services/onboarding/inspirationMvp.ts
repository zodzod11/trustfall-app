/**
 * Onboarding inspiration — MVP policy
 * =====================================
 *
 * **Chosen approach: metadata only (option 1)**
 *
 * We store an optional string in `user_preferences.extra.inspiration_file_name`. It is
 * usually the **local filename** from the picker / `<input type="file">` — a lightweight
 * label the user can clear. **No file bytes are uploaded during onboarding**; there is
 * no Storage path in onboarding.
 *
 * **Tradeoffs**
 * - **vs upload now (option 2):** Faster MVP, no bucket UX, retries, or size limits in this
 *   step. Image uploads already live on Get Matched / contact flows (`uploadMatchRequestImages`,
 *   `trustfallStorage`) where `match_requests.inspiration_image_path` is the real artifact.
 * - **vs defer entirely (option 3):** We keep an optional completion path (style tags *or*
 *   inspiration label) without forcing every user through Get Matched first; we can still
 *   show “you noted a reference” in profile prefs.
 *
 * **Future:** Add `extra.inspiration_storage_path` or prefill match from onboarding once
 * product wants a single upload surface.
 */
export const onboardingInspirationMvpMode = 'metadata_only' as const
