# Saved State Rebuild Summary

Date: 2026-04-16

## 1. What the old handoff required

Source handoff:
- `/Users/zacharydieujuste/Desktop/Trustfall Developer/trustfall-app2/project/docs/OLD_USER_APP_SAVED_STATE_HANDOFF.md`

Core requirements preserved from the old app handoff:
- saved providers/professionals must be a real backend-backed entity
- saved portfolio/style items must be a real backend-backed entity
- saved state must be user-specific
- saved state must persist across sessions/devices
- one shared app-level saved-state store should keep surfaces consistent
- saved styles should remain reusable as inspiration for matching
- local storage / AsyncStorage may exist only as cache, not source of truth

Core requirements intentionally not carried forward:
- device-only saved state as production behavior
- mock/demo ID save logic
- screen-specific raw saved-table joins
- AsyncStorage/localStorage fallback saves for failed backend writes
- seed-backed saved resolution as a primary path

Testing carve-out added after the rebuild:
- non-live mock IDs can still be saved locally for seeded/demo testing
- this applies only to IDs that are not canonical live UUIDs
- live UUID-backed items still use Supabase as the source of truth

## 2. What the current app was doing before

Before this rebuild, the new app had these saved-state problems:

- Web saved state lived in `src/hooks/SavedProvider.tsx` and used `localStorage` as the source of truth.
- Mobile saved state lived in `mobile/contexts/SavedProvider.tsx` and used `AsyncStorage` as the source of truth.
- Both clients stored:
  - `savedPortfolioItemIds`
  - `savedProfessionalIds`
  - `requestSubmissions`
- The UI did not use Supabase `saved_portfolios` as the canonical state.
- There was no backend `saved_professionals` table at all.
- Web `SavedPage` resolved saved IDs against the live explore feed, but only after reading local-only IDs.
- Mobile `Saved` resolved saved IDs against `buildPortfolioFeed()` and `professionalsSeed`.
- Mobile match inspiration loaded saved looks from `professionalsSeed`, not the live catalog.

## 3. What changed

### Backend/schema

Added a new migration:
- `supabase/migrations/20260416110000_saved_professionals.sql`

This adds:
- `public.saved_professionals`
- index on `professional_id`
- authenticated user RLS for select/insert/delete on own rows

### Shared saved backend service

Added:
- `src/lib/saved/service.ts`

This service now provides the shared backend-first saved contract for both clients:
- fetch current saved snapshot
- save portfolio item
- unsave portfolio item
- save professional
- unsave professional

Important behavior:
- validates canonical UUID IDs only
- writes live UUID-backed IDs to Supabase
- lets non-live mock IDs stay local-only for testing
- uses Supabase auth user as the saved-state owner

### Web saved-state store

Updated:
- `src/hooks/savedContext.ts`
- `src/hooks/SavedProvider.tsx`

What changed:
- saved IDs are now hydrated from Supabase instead of `localStorage`
- `localStorage` is now only used for:
  - per-user saved cache
  - request submission persistence
- save/unsave is now optimistic with rollback on backend failure
- sign-in/sign-out refreshes the saved snapshot
- the store now exposes:
  - `hydrated`
  - `error`
  - `refresh()`

### Mobile saved-state store

Updated:
- `mobile/contexts/saved-context.ts`
- `mobile/contexts/SavedProvider.tsx`
- `mobile/constants/storage-keys.ts`

What changed:
- saved IDs are now hydrated from Supabase instead of `AsyncStorage`
- `AsyncStorage` is now only used for:
  - per-user saved cache
  - request submission persistence
- save/unsave is now optimistic with rollback on backend failure
- auth changes refresh the saved snapshot
- the store now exposes:
  - `hydrated`
  - `error`
  - `refresh()`

### UI integration

Updated:
- `src/pages/SavedPage.tsx`
- `mobile/app/(tabs)/saved.tsx`
- `mobile/app/(tabs)/match/index.tsx`

What changed:
- web Saved now renders from backend-backed saved IDs plus live catalog enrichment
- mobile Saved no longer resolves against `professionalsSeed` or `buildPortfolioFeed()`
- mobile match saved-look inspiration now uses the live explore feed instead of seed data
- both Saved screens now treat backend/catalog issues as sync/catalog problems, not “device-only” state

### Database types

Updated:
- `mobile/types/database/rows.ts`
- `mobile/types/database/inserts.ts`
- `mobile/types/database/index.ts`

Added:
- `SavedProfessionalRow`
- `SavedProfessionalInsert`

## 4. Files modified

- `supabase/migrations/20260416110000_saved_professionals.sql`
- `src/lib/saved/service.ts`
- `src/hooks/savedContext.ts`
- `src/hooks/SavedProvider.tsx`
- `src/pages/SavedPage.tsx`
- `mobile/contexts/saved-context.ts`
- `mobile/contexts/SavedProvider.tsx`
- `mobile/constants/storage-keys.ts`
- `mobile/app/(tabs)/saved.tsx`
- `mobile/app/(tabs)/match/index.tsx`
- `mobile/types/database/rows.ts`
- `mobile/types/database/inserts.ts`
- `mobile/types/database/index.ts`

## 5. What still needs backend support

The rebuild is implemented as far as this repo allows, but a few backend-adjacent items still remain:

1. Apply the new migration in the actual Supabase environment.
   - `saved_professionals` must exist remotely before provider saves will work.

2. Public catalog/provider hydration should eventually move behind a cleaner read model.
   - Right now the saved screens still enrich against the live explore feed.
   - That is backend-backed and acceptable, but a public provider catalog view/API would be cleaner long term.

3. Existing `saved_portfolios` schema is still minimal.
   - It still uses composite PK + `saved_at`.
   - The old handoff suggested optional richer metadata (`updated_at`, source surface) only if needed.
   - That was intentionally not added yet.

4. Saved request history is still local.
   - This rebuild focused on saves/favorites, not request history.
   - `requestSubmissions` remains device-local for now.

5. Mock saves still exist as a testing overlay.
   - non-UUID saved IDs are preserved locally in cache
   - they are merged into hydrated saved state for seeded/mock catalog testing
   - they do not replace backend persistence for real live catalog entities

## 6. What was intentionally not carried forward

- No seed/demo ID mapping for save writes
- No device-only save fallback on backend failure
- No raw seed resolution for Saved tab
- No mock save row IDs
- No attempt to preserve the old local-only saved IDs as the production source of truth
- No new metadata fields on saved rows that the product does not currently need

## 7. Remaining work

High-priority remaining work:
- QA saved provider save/unsave after applying the new migration
- verify all save buttons are only used on live UUID-backed content paths
- consider moving request history off local storage into backend records
- add a dedicated hydrated saved-provider query/view if provider cards need richer standalone data than the explore feed provides

## 8. QA checklist

### Web

- Sign in and verify existing saves hydrate from backend on app load.
- Save a look from `ExploreDetailPage`; confirm it appears in `SavedPage`.
- Save a provider from `ExploreDetailPage`; confirm it appears in `SavedPage`.
- Unsave from Saved and confirm it disappears immediately.
- Refresh the browser and confirm saved state persists.
- Sign out and confirm saved state clears from the UI.
- Sign back in on another browser/session and confirm saved items rehydrate.

### Mobile

- Sign in and verify saved IDs hydrate from backend on app load.
- Save a look from `mobile/app/(tabs)/explore/[id].tsx`; confirm it appears in `mobile/app/(tabs)/saved.tsx`.
- Save a pro from `mobile/app/(tabs)/explore/[id].tsx` or `mobile/app/pro/[id].tsx`; confirm it appears in Saved.
- Open Match and verify saved looks come from the live catalog, not seed-only data.
- Unsave from any surface and confirm other screens reflect the change immediately.
- Relaunch the app and confirm saved state rehydrates from backend.

### Backend / schema

- Apply `20260416110000_saved_professionals.sql`
- Confirm RLS allows authenticated users to save/unsave only their own provider rows
- Confirm `saved_portfolios` and `saved_professionals` both work with the same authenticated account
