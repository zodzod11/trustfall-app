# Phase 1 Truth Cleanup Summary

Date: 2026-04-18

Scope: targeted production-truth cleanup before reconnecting the user app to the pro backend. This pass removed dangerous seed/demo truth from the requested surfaces without redesigning the UX.

## 1. Seed / demo truth that existed before

Before this cleanup, production-facing routes still depended on seed/demo truth in these ways:

- `src/pages/ProfilePage.tsx` used `usersSeed[0]` as visible account truth for name, email, city, categories, and budget.
- `src/components/explore/RequestModal.tsx` prefilled request contact fields from `usersSeed[0]` instead of the signed-in profile/session.
- `mobile/app/(tabs)/explore/index.tsx` showed seeded sample catalog content whenever the live catalog was empty, unavailable, or failed.
- `mobile/app/(tabs)/explore/[id].tsx` composed detail data from `professionalsSeed` when live data was missing.
- `mobile/app/pro/[id].tsx` composed provider storefronts from `professionalsSeed` in production-facing logic.
- `mobile/app/(tabs)/saved.tsx` resolved saved looks and saved pros against a seed feed in production.
- Runtime ID normalization in `src/lib/demoCatalogIds.ts` mapped legacy demo IDs in all environments, including production paths.

## 2. Files changed

- `src/lib/viewerAccount.ts` (new)
- `src/pages/ProfilePage.tsx`
- `src/components/explore/RequestModal.tsx`
- `src/lib/demoCatalogIds.ts`
- `mobile/app/(tabs)/explore/index.tsx`
- `mobile/app/(tabs)/explore/[id].tsx`
- `mobile/app/pro/[id].tsx`
- `mobile/app/(tabs)/saved.tsx`

## 3. Production-path truth issues fixed

### Web profile now shows real account truth

`src/pages/ProfilePage.tsx` no longer uses `usersSeed[0]` for visible profile data.

It now reads real session/profile/preference truth through the new shared helper in `src/lib/viewerAccount.ts`, specifically:
- display name from `profiles.display_name` or auth metadata
- email from the real auth user
- city from `profiles.city`
- preferred categories from `user_preferences.preferred_categories`
- budget from `profiles.budget_min` / `profiles.budget_max`

The layout and route stayed the same.

### Web request modal now prefills from the real signed-in user

`src/components/explore/RequestModal.tsx` no longer initializes client name/email/phone from `usersSeed[0]`.

It now:
- loads prefill from real auth/session state and `profiles` / `user_preferences`
- uses real display name, email, and phone where available
- falls back to blank fields when there is no signed-in user instead of fake demo identity

The request flow and modal UI stayed the same.

### Mobile Explore no longer shows fake catalog truth in production

`mobile/app/(tabs)/explore/index.tsx` no longer falls back to seed content in the production path.

It now:
- uses real live catalog rows only
- shows honest loading / unavailable / empty states
- no longer swaps to fake sample looks when live catalog is empty or failing

### Mobile Explore detail no longer depends on seed truth in production

`mobile/app/(tabs)/explore/[id].tsx` no longer resolves detail data from `professionalsSeed` in the production path.

It now:
- reads from the real live portfolio feed
- shows honest loading / retry / unavailable / not-found states when live data is missing
- keeps a dev-only sample fallback through `buildPortfolioFeed()` behind `__DEV__`

### Mobile pro storefront no longer depends on `professionalsSeed` in production

`mobile/app/pro/[id].tsx` no longer builds provider truth from `professionalsSeed`.

It now:
- builds the provider/profile/storefront model from the live remote feed
- shows honest loading / retry / unavailable / not-found states when live data is missing
- keeps mock avatar usage only as display fallback
- keeps a dev-only sample fallback through `buildPortfolioFeed()` behind `__DEV__`

### Mobile Saved no longer resolves against seed/demo feed in production

`mobile/app/(tabs)/saved.tsx` no longer uses `buildPortfolioFeed()` or demo ID normalization to resolve saved items in the production path.

It now:
- resolves saved looks and saved pros only from backend-synced saved IDs plus the live catalog/provider feed
- shows honest unavailable/unresolved states if catalog data is missing
- stops presenting fake saved content through seed/demo feed resolution

### Runtime demo ID normalization is now isolated from production

`src/lib/demoCatalogIds.ts` still exists, but legacy demo ID mapping is now gated off in production.

Production behavior now:
- canonical UUID IDs pass through normally
- legacy demo IDs are no longer rewritten in production

This means production routes, saves, requests, and rendering no longer depend on demo ID bridge behavior.

## 4. Seed / demo code intentionally still remains

The following seed/demo code still remains intentionally after Phase 1:

- `mobile/lib/buildPortfolioFeed.ts` for development-only sample fallback in:
  - `mobile/app/(tabs)/explore/[id].tsx`
  - `mobile/app/pro/[id].tsx`
- `src/lib/demoCatalogIds.ts` still exists for non-production compatibility and legacy/dev handling
- `mobile/lib/catalogIdMap.ts` still re-exports that shared helper, but production mapping is now effectively disabled
- `mobile/lib/mockProfileAvatar.ts` remains as a display-only avatar fallback
- seed data files remain in the repo for seeding/dev/test purposes:
  - `src/data/seed.ts`
  - `mobile/data/seed.ts`
  - Supabase seed SQL files

These are intentionally retained because this phase was about cleaning production truth, not full seed deletion.

## 5. What should be tackled in Phase 2

### A. Remove remaining runtime seed/demo compatibility where it is no longer needed

- Remove remaining `demoCatalogIds` normalization calls from shared saved/match/request helpers once old local/demo IDs are no longer supported.
- Clear or migrate old local saved caches that may still contain non-canonical IDs.

### B. Clean up remaining mixed truth areas outside Phase 1 scope

- `src/pages/MatchPage.tsx` still uses `usersSeed[0]` for suggestion context.
- Web profile/request parity still needs more work beyond visible account truth.
- `src/hooks/SavedProvider.tsx` and `mobile/contexts/SavedProvider.tsx` still keep local `requestSubmissions` activity caches alongside canonical backend request history.

### C. Stabilize the public provider/catalog contract

- Replace raw client dependence on `portfolio_items` + `professionals` join shape with a stable shared public read model.
- Reduce route-level assumptions about provider/profile composition.

### D. Improve production trust states

- Add clearer request-detail image failure UI for older broken uploads.
- Align mobile/web request history and profile parity.
- Harden live service availability messaging for match engine and notify flows.

## 6. Manual QA checklist

### Web

- Sign in and open `Profile`; verify name, email, city, categories, and budget match real backend/account truth.
- Open a request modal from Explore or Match results; verify the prefilled name/email/phone are real session/profile values, not demo values.
- Submit a request and confirm persistence still works.

### Mobile

- Open Explore with live catalog configured; verify real catalog loads.
- Open Explore with no live items published; verify the app shows an honest empty/unavailable state instead of fake sample content.
- Open a look detail from Explore; verify it resolves from live data and shows honest not-found/unavailable states when missing.
- Open a provider storefront; verify it resolves from live data and does not use seeded provider truth in production behavior.
- Open Saved with real saved IDs; verify saved cards resolve only from live catalog rows.
- Test Saved when catalog is unavailable; verify the UI reports that honestly instead of showing fake fallback content.

### ID / truth behavior

- Verify canonical UUID routes still work across web/mobile for:
  - Explore detail
  - Provider profile
  - Saved look resolution
  - Saved professional resolution
  - Request submission
- Verify production builds no longer rely on demo ID mapping.

## 7. Remaining blockers after Phase 1

- The user app still depends on raw backend catalog tables and joins rather than a stable shared public provider/catalog contract.
- There are still local request-submission caches in saved providers that are not canonical backend truth.
- Match and notify flows still depend on external service deployment and correct env setup.
- Some dev/demo compatibility code still remains intentionally for non-production use.
