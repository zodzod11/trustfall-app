# New User App Integration Audit And Pro Handoff

Date: 2026-04-20

Scope:
- web user app in `src/`
- mobile user app in `mobile/`
- shared user-side backend contracts in `src/lib`, `src/services`, `mobile/lib`, `mobile/services`
- Supabase schema/migrations in `supabase/`
- operational match runner in `server/match-engine.ts`

Evidence standard:
- All statements are `Confirmed` from the current repo unless explicitly marked `Inferred`.
- Earlier docs used for delta comparison only:
  - `NEW_USER_APP_PRE_MERGE_AUDIT.md`
  - `docs/app-backend-self-audit.md`
  - `PHASE1_TRUTH_CLEANUP_SUMMARY.md`
  - `docs/REQUEST_SYSTEM_REBUILD_SUMMARY.md`
  - `docs/SAVED_STATE_REBUILD_SUMMARY.md`

Future architecture assumed for this handoff:
- pro backend becomes source of truth for public provider/catalog/storefront data
- user app keeps ownership of user-side flows: auth/session bootstrap, onboarding, saves, requests, match submission/results

## 1. Executive Summary

This app is materially closer to reconnect-ready than it was in the prior audits, but it is still **not clean reconnect-ready today**.

What the app does today:
- It is a dual-client Trustfall user app.
- Users can authenticate, complete onboarding, browse live published provider work, save looks/providers, submit match requests, receive live match results, send direct or match-driven provider requests, and view request history/detail.
- Web and mobile now share much more of the same backend-backed service layer for onboarding, saves, requests, and match flows.

Overall reconnect readiness:
- **Partially ready for integration planning**
- **Not ready for low-risk reconnect / App Store hardening without another cleanup pass**

Strongest areas:
- Onboarding is live-backed through `src/services/onboarding/onboardingApi.ts`.
- Saved state is backend-hydrated through `src/lib/saved/service.ts`.
- Request persistence/history/detail is backend-backed through `src/lib/requests/service.ts` and `src/hooks/useRequestHistory.ts`.
- Match submission/results are now live on both clients through `src/lib/match/submitMatchFlowShared.ts`, `src/lib/match/fetchMatchResults.ts`, and `src/hooks/useMatchRunResultsClient.ts`.

Biggest blockers:
- The app still depends directly on raw Supabase table shapes and nested PostgREST joins for public catalog/provider reads.
- A few production-facing screens still carry non-canonical truth or implementation bugs:
  - `src/pages/ProfilePage.tsx` references `viewer` before it is declared.
  - `src/pages/MatchPage.tsx` still uses `usersSeed[0]` for suggestion context.
  - `mobile/app/pro/[id].tsx` still fabricates storefront avatar/tagline presentation.
  - `mobile/lib/profilePreferences.ts` still derives activity categories from `buildPortfolioFeed()` and `professionalsSeed`.
- Reconnect still depends on backend/environment prep outside the client:
  - latest migrations applied
  - live catalog/media contract stable
  - match engine deployed
  - notify service deployed or intentionally replaced

Biggest risks:
- Schema drift is still being tolerated in runtime via compatibility logic instead of being removed:
  - `src/lib/explore/fetchPublishedPortfolio.ts`
  - `mobile/lib/explore/fetchPublishedPortfolio.ts`
  - `src/lib/requests/service.ts`
- Public provider data is still not a true contract; it is an implementation select string.
- The mobile pro storefront still is not fully source-of-truth-backed because avatar/tagline presentation is mocked.
- Match and request success still rely on secondary operational services after DB persistence.

What has improved since the prior audit:
- `saved_portfolios` and `saved_professionals` are now used as canonical saved state instead of local-only UI state.
- Web requests now create real `contact_requests` rows instead of notify-only flow.
- Mobile request history/detail now reads backend `contact_requests`.
- Mobile match results now read real `match_results` / `match_result_rows` instead of seed ranking.
- Production-path mobile Explore and Saved no longer fall back to fake catalog content when the live catalog is missing.
- Demo ID normalization is gated off in production in `src/lib/demoCatalogIds.ts`.

Bottom line:
- **Good foundation for contract work and backend handoff**
- **Not yet the point where reconnecting to the pro backend would be clean, stable, or App Store-safe**

## 2. Feature Audit

| Feature | Purpose | Current implementation state | State today | Reads / writes | Main files | Reconnect-ready |
|---|---|---|---|---|---|---|
| Auth | Sign in/up, Google on mobile, guest bootstrap when allowed | Real Supabase Auth on both clients | Live backend | Auth session only; no public provider dependency | `src/pages/SignInPage.tsx`, `src/pages/SignUpPage.tsx`, `mobile/app/welcome.tsx`, `mobile/app/sign-in.tsx`, `mobile/app/sign-up.tsx`, `src/lib/auth/ensureSupabaseSession.ts`, `mobile/lib/auth/googleOAuth.ts` | Yes |
| Onboarding | Create user profile + preferences | Shared live onboarding API on both clients | Live backend | Reads/writes `profiles`, `user_preferences`; mobile also avatar storage | `src/services/onboarding/onboardingApi.ts`, `src/pages/OnboardingPage.tsx`, `mobile/app/onboarding.tsx` | Yes |
| Explore | Browse live provider catalog | Both clients load published portfolio feed from Supabase; mobile shows honest unavailable/empty states instead of fake prod fallback | Live backend | Reads `portfolio_items`, joined `professionals`, `portfolio_item_tags` | `src/lib/explore/fetchPublishedPortfolio.ts`, `mobile/lib/explore/fetchPublishedPortfolio.ts`, `src/pages/ExplorePage.tsx`, `mobile/app/(tabs)/explore/index.tsx` | Partially |
| Provider detail / profile | Show one look and provider storefront | Web is mostly live-backed; mobile detail is live-backed with dev-only seed fallback; mobile pro page still has mock storefront presentation | Mixed | Reads live catalog rows; writes saves/requests | `src/pages/ExploreDetailPage.tsx`, `src/pages/ProfessionalPage.tsx`, `mobile/app/(tabs)/explore/[id].tsx`, `mobile/app/pro/[id].tsx` | Partially |
| Saved / favorites | Save looks and providers across devices | Canonical backend snapshot + optimistic UI cache | Mixed | Reads/writes `saved_portfolios`, `saved_professionals`; enriches against live explore feed; keeps local cache | `src/lib/saved/service.ts`, `src/hooks/SavedProvider.tsx`, `mobile/contexts/SavedProvider.tsx`, `src/pages/SavedPage.tsx`, `mobile/app/(tabs)/saved.tsx` | Partially |
| Matching | Capture user request and start ranker | Shared submit flow; web can bootstrap anonymous/email fallback, mobile requires signed-in user | Live backend + local UX state | Writes `match_requests`, uploads to `client-uploads`, calls match engine | `src/lib/match/submitMatchFlowShared.ts`, `src/lib/match/insertMatchRequest.ts`, `src/lib/match/submitMatchFlow.ts`, `mobile/hooks/useMatchSubmission.ts` | Partially |
| Match results | Poll and render ranked providers | Shared live results flow on web/mobile | Live backend | Reads `match_results`, `match_result_rows`, joins back to `portfolio_items` and `professionals` | `src/lib/match/fetchMatchResults.ts`, `src/lib/match/mapMatchRowsToRanked.ts`, `src/hooks/useMatchRunResultsClient.ts`, `src/pages/MatchResultsPage.tsx`, `mobile/app/(tabs)/match/results.tsx` | Partially |
| Request flow | Send provider request from detail or match results | Shared persistence-first request flow on web/mobile | Live backend + notify side effect | Writes `contact_requests`, uploads private images, optionally patches notification status | `src/lib/requests/service.ts`, `src/components/explore/RequestModal.tsx`, `mobile/components/booking/RequestBookingModal.tsx`, `src/lib/requests/notify.ts` | Partially |
| Request history / detail | Show sent requests | Mobile has full history/detail; web only shows recent requests on profile | Live backend | Reads `contact_requests`; detail resolves signed URLs for private images | `src/hooks/useRequestHistory.ts`, `mobile/app/profile-requests.tsx`, `mobile/app/profile-request/[id].tsx`, `src/pages/ProfilePage.tsx` | Partially |
| Profile | Show user account truth and activity | Mobile is mostly live-backed; web has a likely implementation bug in current file | Mixed | Reads `profiles`, `user_preferences`, `contact_requests`; mobile also avatar upload | `src/pages/ProfilePage.tsx`, `src/lib/viewerAccount.ts`, `mobile/app/(tabs)/profile.tsx`, `mobile/lib/profileScreenData.ts` | Not yet |
| Settings / support | Sign out, support path | Minimal but functional | Mostly live backend / local support | Auth sign-out; support is local email-composer flow on mobile | `src/pages/SettingsPage.tsx`, `mobile/app/settings.tsx`, `mobile/app/support.tsx` | Yes |

Feature notes:
- `Auth`: web route gating and boot both call `ensureAuthSession()` via `src/lib/match/ensureSession.ts`; mobile welcome uses `ensureAuthSession()` too, but mobile match submission itself requires an authenticated user in `mobile/hooks/useMatchSubmission.ts`.
- `Explore`: current public read model is still raw PostgREST over `portfolio_items` + `professionals!inner` + `portfolio_item_tags`.
- `Provider profile`: the largest remaining product-truth gap is mobile storefront presentation in `mobile/app/pro/[id].tsx`, which still uses `getMockProfileAvatarUrl()` and a hardcoded tagline generator.
- `Saved`: backend truth exists, but rendering still depends on the explore feed as the enrichment layer.
- `Match`: the backend submit contract currently persists only the fields in `src/lib/match/insertMatchRequest.ts`; mobile refinement UX collects more than the persisted row currently stores.
- `Request history`: mobile is meaningfully ahead of web here.

## 3. Screen-By-Screen Readiness Table

Status key:
- `Ready`: reconnect impact is low
- `Partially ready`: backend-backed but still coupled, mixed, or incomplete
- `Not ready`: current route still carries important truth/contract issues

| Screen / route | Purpose | Data source today | Reads / writes today | Fake / local / seed assumptions still present | After reconnect should read / write | Status |
|---|---|---|---|---|---|---|
| `src/components/layout/RootRoute.tsx` | Web boot redirect | Live auth + onboarding state | Reads session and onboarding status | Anonymous bootstrap / email fallback policy baked in | Same, but keep auth policy explicit | Ready |
| `src/components/layout/RequireOnboardingComplete.tsx` | Web route gate | Live auth + onboarding state | Reads session and onboarding status | Same auth policy assumption | Same | Ready |
| `src/pages/SignInPage.tsx` | Web sign in | Live Supabase Auth | Writes auth session | None | Same | Ready |
| `src/pages/SignUpPage.tsx` | Web sign up | Live Supabase Auth | Writes auth user/session | Anonymous-disabled fallback path | Same | Ready |
| `src/pages/OnboardingPage.tsx` | Web onboarding | Shared onboarding API | Reads/writes `profiles`, `user_preferences` | Local form state only | Same | Ready |
| `src/pages/ExplorePage.tsx` | Web explore | Live catalog | Reads published `portfolio_items` + `professionals` + tags | Recent-search localStorage only | Stable public catalog DTO | Partially ready |
| `src/pages/ExploreDetailPage.tsx` | Web look detail | Live catalog/detail bundle | Reads look + related items; writes saves and requests | None major | Stable public detail DTO + same request write model | Partially ready |
| `src/pages/ProfessionalPage.tsx` | Web provider page | Live catalog filtered by provider id | Reads provider portfolio only | No real provider profile image contract | Stable provider storefront DTO | Partially ready |
| `src/pages/SavedPage.tsx` | Web saved items | Backend saved snapshot + live catalog enrichment | Reads `saved_portfolios`, `saved_professionals`, live catalog | Local cache remains; non-prod ID normalization still exists | Saved truth + stable public catalog DTO | Partially ready |
| `src/pages/MatchPage.tsx` | Web match intake | Live submit flow | Writes `match_requests`, uploads images, triggers match engine | Still uses `usersSeed[0]` for suggestions | Same write flow, remove seed suggestions | Partially ready |
| `src/pages/MatchResultsPage.tsx` | Web match results | Live results polling | Reads `match_results`, `match_result_rows`; opens request modal | Session-stored request summary/upload prefill | Same, but ideally consume denormalized ranked-card contract | Partially ready |
| `src/pages/ProfilePage.tsx` | Web profile | Intended live profile + live request history | Reads viewer summary and recent requests | Current file references `viewer` before declaration; no dedicated request-history route | Real profile summary + optional dedicated requests route | Not ready |
| `src/pages/SettingsPage.tsx` | Web settings | Live auth | Sign-out | None | Same | Ready |
| `mobile/app/index.tsx` | Mobile boot redirect | Live session + onboarding when configured | Reads session and onboarding; local route hint fallback | Misconfigured env goes to welcome; route hint cache | Same | Partially ready |
| `mobile/app/welcome.tsx` | Mobile entry/auth | Live auth when configured | Anonymous bootstrap or Google/email auth | If env missing, honest config warning only | Same | Partially ready |
| `mobile/app/sign-in.tsx` | Mobile sign in | Live auth | Writes auth session | None | Same | Ready |
| `mobile/app/sign-up.tsx` | Mobile sign up | Live auth | Writes auth user | None major | Same | Ready |
| `mobile/app/onboarding.tsx` | Mobile onboarding | Shared onboarding API | Reads/writes `profiles`, `user_preferences`, avatar | Extra mobile helpers for location/avatar | Same | Partially ready |
| `mobile/app/(tabs)/explore/index.tsx` | Mobile explore | Live catalog only | Reads published catalog; local recent searches | No fake prod fallback anymore | Stable public catalog DTO | Partially ready |
| `mobile/app/(tabs)/explore/[id].tsx` | Mobile look detail | Live catalog, dev-only seed fallback | Reads look detail; writes saves and requests | `__DEV__` seed fallback only | Stable public detail DTO | Partially ready |
| `mobile/app/pro/[id].tsx` | Mobile provider storefront | Live catalog rows, dev-only seed fallback | Reads provider portfolio; writes saves/requests | Mock avatar + hardcoded tagline; `__DEV__` seed fallback | Canonical provider storefront contract | Partially ready |
| `mobile/app/(tabs)/saved.tsx` | Mobile saved items | Backend saved snapshot + live catalog enrichment | Reads `saved_portfolios`, `saved_professionals`, live catalog | Local cache remains; unresolved-save states depend on catalog availability | Saved truth + stable public catalog DTO | Partially ready |
| `mobile/app/(tabs)/match/index.tsx` | Mobile match intake | Live submit flow + local draft UX | Writes `match_requests`, uploads images, triggers match engine | `__DEV__` seed fallback for saved look resolution; local draft | Same write flow; keep only UX-local state | Partially ready |
| `mobile/app/(tabs)/match/results.tsx` | Mobile match results | Live results polling | Reads `match_results`, `match_result_rows`; opens request modal | Local draft/session only for summary/prefill | Same, but denormalized ranked-card contract would be safer | Partially ready |
| `mobile/app/(tabs)/profile.tsx` | Mobile profile | Live profile + live requests + saved snapshot | Reads `profiles`, `user_preferences`, `contact_requests`; writes avatar | Mock avatar fallback for missing user photo is UI-only | Same | Ready |
| `mobile/app/profile-requests.tsx` | Mobile request history | Live request history | Reads `contact_requests` | None major | Same | Ready |
| `mobile/app/profile-request/[id].tsx` | Mobile request detail | Live request detail | Reads one `contact_requests` row + signed image URLs | None major | Same | Ready |
| `mobile/app/profile-onboarding-preferences.tsx` | Mobile onboarding-pref editor | Live profile/preferences | Reads/writes onboarding prefs | No web parity | Same | Partially ready |
| `mobile/app/profile-personal-preferences.tsx` | Mobile personal prefs | Mixed live + local/seed-derived activity | Reads profile; writes budgets | Activity categories still derive from local `requestSubmissions`, `buildPortfolioFeed()`, `professionalsSeed` | Canonical backend-derived activity/preferences | Not ready |
| `mobile/app/settings.tsx` | Mobile settings | Live auth | Sign-out | None | Same | Ready |
| `mobile/app/support.tsx` | Mobile support | Local flow | Opens email composer | No backend ticketing model | Optional | Can wait |

## 4. Live Vs Fake Inventory

### A. Live backend truth

- Auth/session:
  - `src/lib/auth/ensureSupabaseSession.ts`
  - `src/lib/match/ensureSession.ts`
  - `mobile/lib/ensureAuthSession.ts`
- Onboarding:
  - `src/services/onboarding/onboardingApi.ts`
- Public catalog reads:
  - `src/lib/explore/fetchPublishedPortfolio.ts`
  - `mobile/lib/explore/fetchPublishedPortfolio.ts`
  - `src/lib/explore/fetchProfessionalById.ts`
  - `src/lib/explore/fetchPortfolioItemById.ts`
- Saved state:
  - `src/lib/saved/service.ts`
  - `supabase/migrations/20260416110000_saved_professionals.sql`
- Requests:
  - `src/lib/requests/service.ts`
  - `supabase/migrations/20260416143000_request_system_rebuild.sql`
- Match:
  - `src/lib/match/insertMatchRequest.ts`
  - `src/lib/match/fetchMatchResults.ts`
  - `src/lib/matching/persistResults.ts`
  - `server/match-engine.ts`

### B. Seed data still present

- `src/data/seed.ts`
- `mobile/data/seed.ts`
- `mobile/lib/buildPortfolioFeed.ts`
- `professionalsSeed` still used in `mobile/lib/profilePreferences.ts`
- `usersSeed` still used in:
  - `src/pages/MatchPage.tsx`
  - `mobile/components/booking/RequestBookingModal.tsx` when Supabase is not configured

### C. Demo ID / legacy ID handling

- `src/lib/demoCatalogIds.ts`
- `mobile/lib/catalogIdMap.ts`

Current reality:
- Production demo ID rewriting is disabled by `process.env.NODE_ENV !== 'production'` in `src/lib/demoCatalogIds.ts`.
- The compatibility layer still exists for local/dev/testing and for merged local caches.

### D. Local-only state and caches

- Saved-state caches:
  - `src/hooks/SavedProvider.tsx`
  - `mobile/contexts/SavedProvider.tsx`
- Local request-submission activity cache:
  - same SavedProvider files above
- Match request summary persistence:
  - `src/lib/match/resultsSession.ts`
  - `mobile/contexts/MatchDraftContext.tsx`
- Recent searches:
  - `src/pages/ExplorePage.tsx`
  - `mobile/app/(tabs)/explore/index.tsx`
- Route hints:
  - `src/lib/onboarding/routeCache.ts`
  - `mobile/app/index.tsx`

### E. Harmless UI-only fallback

- User avatar fallback in mobile profile:
  - `mobile/lib/profileScreenData.ts`
  - `mobile/lib/mockProfileAvatar.ts`
- Recent search caches
- Match request summary persistence for post-submit UX
- Route-hint caching for boot recovery
- Dev-only seed fallback behind `__DEV__` in:
  - `mobile/app/(tabs)/explore/[id].tsx`
  - `mobile/app/pro/[id].tsx`
  - `mobile/app/(tabs)/match/index.tsx`

### F. Dangerous or fragile production-path dependency

- Raw PostgREST public catalog contract:
  - `src/lib/explore/constants.ts`
  - `mobile/lib/explore/constants.ts`
  - `src/lib/matching/loadCatalog.ts`
- Runtime schema-drift fallback for `professionals.request_count`:
  - `src/lib/explore/fetchPublishedPortfolio.ts`
  - `mobile/lib/explore/fetchPublishedPortfolio.ts`
- Runtime schema-drift fallback for old `contact_requests` shape/statuses:
  - `src/lib/requests/service.ts`
- Web match suggestions still seeded:
  - `src/pages/MatchPage.tsx`
- Mobile storefront avatar/tagline still mocked:
  - `mobile/app/pro/[id].tsx`
  - `mobile/lib/mockProfileAvatar.ts`
- Mobile personal preferences derive categories from seeds/local request cache:
  - `mobile/lib/profilePreferences.ts`
- Public media URLs built client-side from bucket/key assumptions:
  - `src/lib/explore/publicUrls.ts`
- Operational dependency on secondary services:
  - `src/lib/match/triggerMatchEngine.ts`
  - `mobile/lib/match/triggerMatchEngine.ts`
  - `src/lib/requests/notify.ts`
  - `mobile/lib/notifyContactRequest.ts`

### G. Notify-only or non-canonical flows

- Request persistence is canonical in `contact_requests`, but notify is still a best-effort side effect written back later.
- `requestSubmissions` is still stored locally and still influences mobile personal-preferences activity derivation.
- Mobile support remains device-email based, not backend-owned.

## 5. Merge / Reconnect Blockers

| Blocker | Why it matters | Affects | Severity | Recommended next action |
|---|---|---|---|---|
| No stable public provider/catalog contract | User app is still coupled to internal table names, joins, and bucket assumptions | Explore, detail, pro pages, Saved enrichment, match engine, match results | Critical | Define a versioned public read model/API before reconnecting |
| `src/pages/ProfilePage.tsx` implementation bug | Current file uses `viewer` before declaration; likely runtime failure on a key account surface | Web profile, request history preview, trust | Critical | Fix the component immediately and QA it against real profile data |
| Backend environment may still be behind migrations | App code contains compatibility shims because schema may not be current | Explore social-proof fields, saved providers, request lifecycle fields | High | Apply and verify migrations in the real integration environment |
| Mobile storefront is not fully canonical | Public provider presentation still uses mock avatar/tagline instead of backend-provided storefront fields | Mobile pro page, brand trust, App Store quality | High | Add real provider image/tagline/storefront fields to public contract and remove mock presentation |
| Match and notify still depend on external services | App can save records but still fail operationally in the user-visible flow | Match submission, request delivery | High | Deploy stable match/notify endpoints or move these flows behind owned backend endpoints |
| Remaining local/seed-derived preference truth | Some personalization is still derived from local caches and seed data instead of canonical backend activity | Mobile personal preferences, trust in personalization | Medium | Remove seed-based derivation from `mobile/lib/profilePreferences.ts` and use canonical backend activity or analytics |
| Raw media path assumptions | Clients currently construct public URLs and assume the `portfolio` bucket/public-access strategy | Explore, saved, detail, match results | Medium | Backend should expose resolved media URLs or a stable media object contract |
| Web match page still seeded for suggestions | Core matching UI still contains seed-era suggestion context | Web match intake | Medium | Remove `usersSeed[0]` from `src/pages/MatchPage.tsx` |

## 6. What This User App Needs From The Pro Backend

### A. Provider identity / storefront

Current app consumers need the equivalent of:

- `provider_id` / current `professionals.id`
- `slug` (already selected in explore queries even if routes still use id)
- `display_name`
- `title`
- `category`
- `city`
- `bio` / current `about`
- `rating`
- `review_count`
- `request_count`
- `years_experience`
- publish / visibility state
- optional direct-contact fields if product still wants them exposed:
  - `booking_phone`
  - `booking_email`

What is missing from the current contract but the app clearly needs for clean integration:
- `profile_image_url` or equivalent canonical storefront avatar field
- explicit marketplace visibility semantics, not just `published`
- stable trust-signal fields that do not require client fallback logic

Current consumers:
- Explore cards:
  - `src/lib/explore/mapRowToFeedItem.ts`
  - `mobile/lib/explore/mapRowToFeedItem.ts`
- Web provider page:
  - `src/pages/ProfessionalPage.tsx`
- Mobile provider storefront:
  - `mobile/app/pro/[id].tsx`

### B. Portfolio / media

Current app consumers need the equivalent of:

- `portfolio_item_id` / current `portfolio_items.id`
- `provider_id` / current `professional_id`
- `service_title`
- `category`
- `description`
- `price`
- `service_type`
- `duration_minutes`
- `before_image_url` or `before_image_path`
- `after_image_url` or `after_image_path`
- `tags[]`
- `sort_order`
- published / visibility state

Current source assumptions:
- Tags come from `portfolio_item_tags (tag)`.
- Images are currently converted client-side through `portfolioImagePublicUrl()` in:
  - `src/lib/explore/publicUrls.ts`
  - `mobile/lib/explore/publicUrls.ts`

What should be stable on the backend side:
- resolved media URLs or a stable media object list
- ordering / spotlight behavior
- explicit contract for whether a portfolio item is both a service and a media showcase

### C. Pricing / service metadata

The mobile pro page already assumes lightweight service metadata beyond a pure portfolio card:

- `service_type`
- `price`
- `duration_minutes`
- `description`
- category-aligned service labels

Current evidence:
- `mobile/lib/explore/constants.ts`
- `mobile/app/pro/[id].tsx`
- migration `supabase/migrations/20260415130000_portfolio_item_service_metadata.sql`

Backend expectation:
- these fields must be consistently populated if the mobile Services tab is expected to feel real
- if the long-term model separates “portfolio item” from “bookable service,” that split should be hidden from the user app behind a stable storefront/service DTO

### D. Match / result contract

#### Match request creation

The current shared insert contract writes:

- `user_id`
- `status = submitted`
- `category`
- `location_text`
- `tags[]`
- `vision_notes`
- `desired_style_text`
- `current_state_text`
- `budget_min`
- `budget_max`
- `saved_look_portfolio_item_id`
- `inspiration_image_path`
- `current_photo_path`
- `submitted_at`

Current source:
- `src/lib/match/insertMatchRequest.ts`

Important integration note:
- Mobile match UX collects more refinement data than the persisted shared row currently stores.
- The pro/backend side should not assume date/time/radius/refinement fields are already part of the stable match-request contract unless that contract is explicitly expanded.

#### Match result rows

The current results reader requires:

- from `match_results`:
  - `id`
  - `match_request_id`
  - `status`
  - `ranker_version`
  - `error_message`
  - `generated_at`
  - `payload`
- from `match_result_rows`:
  - `id`
  - `match_result_id`
  - `rank`
  - `professional_id`
  - `portfolio_item_id`
  - `total_score`
  - `component_scores`
  - `reasons`

Current source:
- `src/lib/match/fetchMatchResults.ts`
- `src/lib/matching/persistResults.ts`

#### Provider cards rendered from match results

The current result-card UI also requires joined catalog/storefront fields:

- `portfolio_items.service_title`
- `portfolio_items.before_image_path`
- `portfolio_items.after_image_path`
- `professionals.display_name`
- `professionals.title`
- `professionals.city`
- `professionals.rating`
- `professionals.booking_phone`
- `professionals.booking_email`

Current source:
- `src/lib/match/fetchMatchResults.ts`
- `src/lib/match/mapMatchRowsToRanked.ts`

Best backend-side contract:
- either return ranked-card DTOs directly
- or return stable references plus denormalized display fields so the client does not have to re-join internal provider tables

### E. Request contract

#### Request creation

The user app currently writes:

- `professional_id`
- `portfolio_item_id`
- `match_request_id` (optional)
- `request_type` (`direct` or `match`)
- `message`
- `preferred_date_text`
- `client_name`
- `client_email`
- `client_phone`
- `provider_name_snapshot`
- `portfolio_title_snapshot`
- `category_snapshot`
- `portfolio_image_url_snapshot`
- `inspiration_image_path`
- `current_photo_path`
- `status`

Current source:
- `src/lib/requests/types.ts`
- `src/lib/requests/service.ts`

#### Request history / detail

The app reads:

- all fields above
- `provider_notified_at`
- `notified_channels`
- `notification_error`
- `created_at`
- `updated_at`
- signed asset URLs for detail:
  - `inspiration_image_url`
  - `current_photo_url`

Current source:
- `src/hooks/useRequestHistory.ts`
- `mobile/app/profile-requests.tsx`
- `mobile/app/profile-request/[id].tsx`

#### Request statuses

The normalized status vocabulary the app expects now is:

- `submitted`
- `notified`
- `viewed`
- `responded`
- `closed`
- `cancelled`

Current source:
- `src/lib/requests/types.ts`
- migration `supabase/migrations/20260416143000_request_system_rebuild.sql`

#### Request attachments

Current behavior:
- uploads go to `client-uploads/{user_id}/contact-requests/{request_id}/...`
- stored DB fields are paths, not resolved URLs
- detail screens resolve signed URLs at read time

#### Current reality on lifecycle ownership

- The client actively writes `submitted` and `notified`.
- Provider-side lifecycle updates (`viewed`, `responded`, `closed`, `cancelled`) are structurally supported but not yet fully driven by the current user app.

## 7. What Should Stay Private / Not Be Consumed By The User App

The user app should not directly consume:

- `professionals.owner_user_id`
- provider auth account ids or role-linking internals
- raw storage object paths when a resolved URL can be returned instead
- internal moderation / approval workflow fields unless intentionally exposed as a simple public state
- unpublished drafts and unpublished media
- service-role-only operational fields
- internal notes, CRM metadata, delivery logs, or provider support metadata
- internal matching/debug payloads beyond what the user app needs to render ranked results

Conditional decision that should be made explicitly:
- `booking_phone` and `booking_email` are currently used for direct Call/Text actions.
- If the pro/backend team does **not** want direct provider contact details exposed publicly, the user app must switch to request-only contact actions and those fields should be removed from the public contract.

## 8. Raw-Table Coupling Vs Ideal Contract

### Where the user app still reads raw Supabase table shapes directly

- Public catalog list:
  - `src/lib/explore/fetchPublishedPortfolio.ts`
  - `mobile/lib/explore/fetchPublishedPortfolio.ts`
- Public provider/detail:
  - `src/lib/explore/fetchProfessionalById.ts`
  - `src/lib/explore/fetchPortfolioItemById.ts`
- Match engine catalog load:
  - `src/lib/matching/loadCatalog.ts`
- Match results display:
  - `src/lib/match/fetchMatchResults.ts`
- Saved-screen enrichment:
  - `src/pages/SavedPage.tsx`
  - `mobile/app/(tabs)/saved.tsx`
- Request history/detail:
  - `src/lib/requests/service.ts`

### What public read model / stable API contract would be better

- `public_catalog_list`
  - already filtered to published/searchable providers and items
  - resolved media URLs
  - provider storefront summary embedded
  - tags and service metadata normalized
- `public_portfolio_item_detail`
  - one look + enough provider/storefront summary + related items
- `public_provider_storefront`
  - provider identity, avatar, trust signals, bio, service summary, media list
- `my_match_results`
  - stable ranked cards instead of requiring joins back to raw provider tables
- `my_requests`
  - user-scoped history/detail DTO with signed asset URLs resolved server-side

### Implementation details the user app should not have to know

- actual base table names
- nested PostgREST relationship syntax like `professionals!inner(...)`
- whether `request_count` is denormalized or derived
- whether `service_type` / `duration_minutes` live on `portfolio_items` or another model
- bucket names and raw media paths
- legacy request-status vocabulary
- transitional nullability / compatibility shims

## 9. Backend Preparation Checklist For The Pro App Team

### Must prepare before integration

- Apply and verify the integration environment migrations:
  - `supabase/migrations/20260407180000_portfolio_items_description.sql`
  - `supabase/migrations/20260415120000_professionals_request_count.sql`
  - `supabase/migrations/20260415130000_portfolio_item_service_metadata.sql`
  - `supabase/migrations/20260416110000_saved_professionals.sql`
  - `supabase/migrations/20260416143000_request_system_rebuild.sql`
- Provide a stable public provider/catalog read model for:
  - explore feed
  - look detail
  - provider storefront
- Decide and document the public media strategy:
  - resolved public URLs
  - signed URLs
  - CDN strategy
- Provide a canonical provider storefront image field
- Stabilize the request contract and status vocabulary
- Stabilize the match-result contract or provide ranked-card DTOs
- Decide whether public direct contact fields (`booking_phone`, `booking_email`) remain part of the consumer contract
- Provide stable deployed equivalents for:
  - match execution endpoint
  - provider-notify endpoint or replacement workflow

### Should prepare during integration

- Remove schema-drift compatibility requirements so client retries/fallbacks can be deleted
- Backfill missing `provider_name_snapshot`, `portfolio_title_snapshot`, `category_snapshot`, and image snapshots where useful
- Add explicit visibility semantics beyond a simple `published` boolean if needed:
  - active
  - approved
  - searchable
- Normalize provider storefront completeness requirements so half-configured providers do not appear in consumer surfaces
- Confirm RLS/policies for:
  - `saved_portfolios`
  - `saved_professionals`
  - `contact_requests`
  - `match_requests`
  - `match_results`

### Can prepare after integration

- Richer trust signals / reviews / verification
- Availability / service-area / travel-radius / booking-mode modeling
- Real-time match completion or push update flow
- Provider-side request lifecycle automation for `viewed`, `responded`, `closed`, `cancelled`
- Better saved-item enrichment view if Saved needs richer standalone provider cards

## 10. Important Information To Send To The Pro App / Backend Side

Pasteable summary:

The new user app is much closer to backend integration than it was in the last audit. Saves are now backend-backed (`saved_portfolios` + `saved_professionals`), requests are now persisted in `contact_requests` before notify, mobile request history/detail reads backend rows, and mobile/web both use the live match pipeline (`match_requests` -> match engine -> `match_results` / `match_result_rows`).

The main reconnect blockers are no longer “missing core flows.” They are contract and cleanup issues:

1. The user app still reads public provider/catalog data directly from raw Supabase table joins (`portfolio_items` + `professionals` + `portfolio_item_tags`) instead of a stable public read model.
2. The current web profile route has a real implementation bug in `src/pages/ProfilePage.tsx`, and a few remaining non-canonical truth paths still exist (`src/pages/MatchPage.tsx`, `mobile/app/pro/[id].tsx`, `mobile/lib/profilePreferences.ts`).
3. The real integration environment needs to have the recent migrations applied and stable operational endpoints for match execution and provider notification.

Backend contracts the user app needs from the pro side:
- stable public provider storefront contract
- stable public portfolio/media contract
- stable lightweight service metadata (`service_type`, `duration_minutes`, price, description)
- stable match-results contract or ranked-card DTO
- stable request lifecycle/status contract
- clear media URL strategy

Screens most affected by the public contract are:
- web/mobile Explore
- web/mobile look detail
- mobile provider storefront
- web/mobile Saved enrichment
- web/mobile Match results rendering

The user app is already in good shape on:
- onboarding
- backend-backed saves
- request persistence/history/detail
- live match submission/results

What still needs cleanup on the user-app side:
- fix `src/pages/ProfilePage.tsx`
- remove remaining seed/local truth from `src/pages/MatchPage.tsx` and `mobile/lib/profilePreferences.ts`
- replace mobile storefront mock avatar/tagline with backend-owned provider fields
- move public catalog consumption behind a stable DTO instead of raw PostgREST select strings

## 11. Final Recommendation

### Is this user app ready to reconnect now?

No, not cleanly.

It is ready for:
- contract definition
- backend prep
- integration planning

It is not ready for:
- low-risk reconnect to a pro-owned backend contract
- App Store-quality reconnect without another cleanup pass

### Top 3 blockers

1. **No stable public provider/catalog contract**
   - current app still couples directly to raw Supabase joins and storage-path assumptions

2. **Remaining user-app truth/implementation issues**
   - `src/pages/ProfilePage.tsx` bug
   - `src/pages/MatchPage.tsx` seed-based suggestion context
   - `mobile/app/pro/[id].tsx` mock storefront presentation
   - `mobile/lib/profilePreferences.ts` seed/local activity derivation

3. **Backend environment / operations are not yet a clean dependency**
   - migrations must be applied
   - match engine must be deployed and reachable
   - notify service must be deployed or intentionally replaced

### What to fix next on the user-app side

1. Fix `src/pages/ProfilePage.tsx` and QA the profile surface against real account data.
2. Remove the remaining non-canonical truth paths:
   - `src/pages/MatchPage.tsx`
   - `mobile/lib/profilePreferences.ts`
   - `mobile/app/pro/[id].tsx`
3. Put a thin adapter in front of public catalog/storefront reads so the app can switch from raw Supabase selects to a stable backend DTO with minimal route churn.

### What the pro backend team should prepare next

1. Ship and document the public provider/catalog/storefront contract.
2. Apply and verify the required schema changes in the real environment.
3. Lock the match-result and request contracts, including media URL strategy and contact exposure policy.

Final call:
- **Do not reconnect this user app directly to pro-owned raw tables as-is.**
- **Do reconnect it once the public read model and the small remaining truth bugs are cleaned up.**
