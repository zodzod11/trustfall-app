# App And Backend Self-Audit

Date: 2026-04-16

Status legend:
- `Confirmed`: directly supported by repo code, migrations, services, or route files.
- `Inferred`: likely true from architecture or usage patterns, but not fully proven by a direct runtime caller in this repo.
- `Needs manual comparison`: requires the older user app codebase to verify.

## 1. Executive summary

This repo is a dual-client Trustfall codebase with:
- a web user app in `src/`
- a mobile user app in `mobile/`
- a Supabase-backed backend in `supabase/`
- two local Node services in `server/`:
  - `server/match-engine.ts` for match runs
  - `server/notifications.mjs` for request notifications

The current system is not one single maturity level across clients:
- The web app is the most backend-connected path for live catalog + onboarding + match request + match result retrieval.
- The mobile app is mixed: some screens use live Supabase data, but key surfaces still fall back to seed data, local storage, or placeholder logic.
- The backend schema is ahead of parts of the client implementation. Tables for `saved_portfolios`, `contact_requests`, `match_requests`, `match_results`, and pro-owned catalog content already exist, but the clients do not use them consistently.

Bottom line:
- The backend can support a meaningful live catalog and request flow today.
- The web app is closer to a real live marketplace than mobile.
- The mobile app is not yet fully ready to consume a shared pro-fed backend as source of truth without refactoring away seed/local assumptions.
- A public provider catalog read model is strongly recommended before merging fully onto the pro backend.

## 2. App feature audit

| Feature | Web app (`src/`) | Mobile app (`mobile/`) | Overall status |
|---|---|---|---|
| Auth | Supabase auth wired in `src/pages/SignInPage.tsx`, `src/pages/SignUpPage.tsx`, `src/components/layout/RootRoute.tsx` | Supabase auth wired in `mobile/app/welcome.tsx`, `mobile/app/sign-in.tsx`, `mobile/app/sign-up.tsx` | `Partially working` |
| Onboarding | Live onboarding flow via `src/pages/OnboardingPage.tsx` and `src/services/onboarding/onboardingApi.ts` | Reuses shared onboarding logic in `mobile/app/onboarding.tsx` and `mobile/lib/onboarding.ts` | `Working` |
| Explore catalog | Live catalog via `src/lib/explore/fetchPublishedPortfolio.ts` | Live when available, seed fallback in `mobile/app/(tabs)/explore/index.tsx` | `Partial / mixed` |
| Provider detail | Live detail pages in `src/pages/ExploreDetailPage.tsx` and `src/pages/ProfessionalPage.tsx` | Mixed live/seed detail in `mobile/app/(tabs)/explore/[id].tsx` and `mobile/app/pro/[id].tsx` | `Partial / mixed` |
| Saved/favorites | Local-only via `src/hooks/SavedProvider.tsx`; does not use `saved_portfolios` | AsyncStorage-only via `mobile/contexts/SavedProvider.tsx`; does not use `saved_portfolios` UI path | `Working locally, not backend-backed` |
| Matching | Live request insert + storage upload + match runner trigger in `src/lib/match/submitMatchFlow.ts`; results poll DB | Local seed-based ranking in `mobile/features/matching/rankProfessionals.ts`; no live result polling | `Web working, mobile mocked` |
| Booking/request flow | Notify-only request modal in `src/components/explore/RequestModal.tsx`; no DB `contact_requests` insert | `mobile/components/booking/RequestBookingModal.tsx` can insert `contact_requests`, upload images, and notify | `Partial and inconsistent across clients` |
| Request history | Local-only in saved provider | Local-only in saved provider; dedicated request screens exist | `Local only` |
| Notifications | HTTP notify server only; no in-app push | HTTP notify server only; no in-app push | `Partial / operational only` |
| Profile/settings | Profile is mostly seed/static in `src/pages/ProfilePage.tsx`; settings minimal | Profile uses live profile model in `mobile/app/(tabs)/profile.tsx`; settings minimal | `Partial` |
| Pro-facing surfaces | Provider page exists, but no web pro management client | `mobile/services/pro/*` exists, but not a complete pro app navigation tree | `Backend support exists, product surface incomplete` |

## 3. Screen-by-screen behavior audit

### Mobile routes

| Screen | Purpose | What it does today | Data shown / actions | Status |
|---|---|---|---|---|
| `mobile/app/index.tsx` | boot router | checks auth + onboarding and redirects to welcome, onboarding, or explore | uses `onboardingApi.getOnboardingState()` and shared bootstrap helpers | `Confirmed working` |
| `mobile/app/welcome.tsx` | entry/auth choice | Google sign-in or guest/session bootstrap | Supabase auth, `ensureAuthSession` | `Working, env-dependent` |
| `mobile/app/sign-in.tsx` | email auth | signs in with password; supports Google | Supabase auth | `Working` |
| `mobile/app/sign-up.tsx` | account creation | signs up with password; supports Google | Supabase auth | `Working` |
| `mobile/app/onboarding.tsx` | onboarding | runs shared onboarding steps and saves profile/preferences | `profiles`, `user_preferences`, avatar uploads | `Working` |
| `mobile/app/(tabs)/explore/index.tsx` | catalog browse | category browse, search, card list/grid, saved toggle | live catalog when available, else `mobile/data/seed.ts` | `Partial; mixed live + fallback` |
| `mobile/app/(tabs)/explore/[id].tsx` | piece detail | shows selected portfolio item, more from same pro, request modal | `useExplorePortfolio()` or seed fallback | `Partial; mixed live + fallback` |
| `mobile/app/pro/[id].tsx` | pro profile/storefront | shows pro summary, services, portfolio, request modal | remote items if found, else seed profile; uses mock avatar/tagline logic | `Partial; mixed live + mocked presentation` |
| `mobile/app/(tabs)/saved.tsx` | saved tab | lists saved items and saved pros | AsyncStorage saved ids resolved against `buildPortfolioFeed()` and `professionalsSeed` | `Partially working; not live-backed` |
| `mobile/app/(tabs)/match/index.tsx` | match intake | multi-step request flow for style/current photo/timing/location | local draft + AsyncStorage; saved looks rail based on seed | `Working UI, not live-backed` |
| `mobile/app/(tabs)/match/results.tsx` | match results | shows ranked results after artificial wait | `rankProfessionals()` over `professionalsSeed` | `Mocked / placeholder` |
| `mobile/app/(tabs)/profile.tsx` | user profile | profile summary, avatar, counts, links to settings/preferences/requests | live `fetchProfileScreenModel()` plus local counts | `Working, but mixed data sources` |
| `mobile/app/profile-onboarding-preferences.tsx` | edit onboarding prefs | updates onboarding categories, style tags, contact prefs, location, email, phone | live profile model + `saveOnboardingPreferences()` | `Working` |
| `mobile/app/profile-personal-preferences.tsx` | edit profile prefs | budget and category preferences | live profile model + `savePersonalBudgetRange()`; some category derivation still seed-dependent | `Partial` |
| `mobile/app/profile-requests.tsx` | request history | shows previously submitted requests | local `requestSubmissions` only | `Working locally only` |
| `mobile/app/profile-request/[id].tsx` | request detail | detail view for one saved request submission | local `requestSubmissions` only | `Working locally only` |
| `mobile/app/settings.tsx` | settings | sign out and support navigation | Supabase sign-out | `Minimal but working` |
| `mobile/app/support.tsx` | support | opens mail composer to support | `expo-mail-composer`, static support constants | `Working` |

### Web routes

| Route | Purpose | What it does today | Data shown / actions | Status |
|---|---|---|---|---|
| `src/App.tsx` | app shell/router | defines routes and onboarding gate | wraps app with `SavedProvider` and router | `Confirmed working` |
| `src/components/layout/RootRoute.tsx` | boot route | checks session + onboarding and redirects | `ensureAuthSession()`, onboarding API | `Working` |
| `src/pages/SignInPage.tsx` | email auth | password sign-in | Supabase auth | `Working` |
| `src/pages/SignUpPage.tsx` | account creation | password sign-up | Supabase auth | `Working` |
| `src/pages/OnboardingPage.tsx` | onboarding | multi-step onboarding and completion | onboarding API + auth credential application | `Working` |
| `src/pages/ExplorePage.tsx` | explore/search | live explore feed, personalization, list/grid | `useExplorePortfolio()`, onboarding personalization | `Working` |
| `src/pages/ExploreDetailPage.tsx` | portfolio detail | detail page, related work, request modal, tel/sms links | live detail fetch bundle | `Working` |
| `src/pages/ProfessionalPage.tsx` | provider page | shows a provider's published portfolio | live `useProfessionalPortfolio()` | `Working` |
| `src/pages/MatchPage.tsx` | match intake | request wizard; uploads files; submits match request | DB write + storage upload + match-engine trigger | `Working` |
| `src/pages/MatchResultsPage.tsx` | live match results | polls DB result rows and renders ranked professionals | `match_results`, `match_result_rows` | `Working if backend services are up` |
| `src/pages/SavedPage.tsx` | saved list | resolves local saved ids against live feed | `SavedProvider` + `useExplorePortfolio()` | `Partial; local state only` |
| `src/pages/ProfilePage.tsx` | user profile | static profile card + local counts | `usersSeed[0]`, local saved state | `Partially working; mostly placeholder` |
| `src/pages/SettingsPage.tsx` | settings | sign out only | Supabase auth | `Minimal but working` |

### Flow status summary

| Flow | Current state |
|---|---|
| Onboarding | `Confirmed working` across web and mobile |
| Auth | `Confirmed working`, but anonymous/guest behavior depends on project config |
| Explore/search | `Working on web`, `partial on mobile` due to live/seed split |
| Saved/favorites | `Working locally only`; not tied to cloud `saved_portfolios` |
| Profile browsing | `Working`, but mobile mixes live/seed and web is split across piece detail and pro page |
| Portfolio/media viewing | `Working`, but image delivery strategy is inconsistent with private bucket setup |
| Matching | `Web live`, `mobile mocked` |
| Booking/request | `Mobile partially live`; `web notify-only`; no unified lifecycle |
| Messaging/chat | `Not implemented` |
| Notifications | `Email/SMS notify server only`; no in-app/push system |
| Settings/profile/account | `Minimal`; mobile stronger than web |
| Pro-related surfaces | `Partial`; backend services exist but no complete shared pro-facing product here |

## 4. Data dependency map

### Screen-to-data map: mobile

| Screen / feature | Reads | Writes | Endpoints / functions | Notes |
|---|---|---|---|---|
| boot/auth | `profiles`, `user_preferences`, auth session | none | `onboardingApi.getOnboardingState()`, Supabase auth | shared boot logic from `src/` |
| onboarding | `profiles`, `user_preferences` | `profiles`, `user_preferences`, avatar storage | `saveProgress`, `completeOnboarding`, `uploadAvatar` | live |
| explore | `portfolio_items`, joined `professionals`, tags; fallback `mobile/data/seed.ts` | local saved ids | `mobile/lib/explore/fetchPublishedPortfolio.ts`, `useExplorePortfolio()` | mixed live + seed |
| pro detail | remote feed or seed profile | local saved ids, local request submission, optional `contact_requests` | `RequestBookingModal`, `catalogIdMap`, `createContactRequest()` | mixed live + seed |
| saved | AsyncStorage saved ids + seed feed | AsyncStorage | `mobile/contexts/SavedProvider.tsx` | ignores `saved_portfolios` service |
| match intake | local draft, seed-based saved looks | AsyncStorage draft | `MatchDraftContext` | local |
| match results | `professionalsSeed` | local request submission | `rankProfessionals()` | mock ranking |
| profile | `profiles`, `user_preferences` via `fetchProfileScreenModel()` | avatar upload; preference writes | `mobile/lib/profileScreenData.ts`, `mobile/lib/profilePreferences.ts` | mixed with local counts |
| request history | AsyncStorage request list | AsyncStorage | `SavedProvider` | local only |

### Screen-to-data map: web

| Screen / feature | Reads | Writes | Endpoints / functions | Notes |
|---|---|---|---|---|
| boot/auth | auth session, `profiles`, `user_preferences` | none | `ensureAuthSession()`, onboarding API | live |
| onboarding | `profiles`, `user_preferences` | `profiles`, `user_preferences` | `src/services/onboarding/onboardingApi.ts` | live |
| explore | `portfolio_items`, joined `professionals`, tags | local saved ids | `src/lib/explore/fetchPublishedPortfolio.ts` | live |
| detail/pro page | `portfolio_items`, joined `professionals` | local saved ids, local request submission | `fetchExploreDetailBundle()`, `RequestModal` | request path is not DB-backed |
| match intake | auth session | `match_requests`, storage paths | `submitMatchRequestFlow()`, `triggerMatchEngine()` | live |
| match results | `match_results`, `match_result_rows` | none | `useMatchRunResults()` | live |
| saved | local saved ids + live explore feed | local saved ids | `SavedProvider`, `useExplorePortfolio()` | no `saved_portfolios` use |
| profile | `usersSeed[0]`, local saved/request counts | none | `src/pages/ProfilePage.tsx` | placeholder |

### Backend calls by table / endpoint

| Backend dependency | Used by | Current role |
|---|---|---|
| `profiles` | onboarding, profile, auth gating | active |
| `user_preferences` | onboarding, personalization | active |
| `professionals` | live catalog joins, pro services | active |
| `portfolio_items` | explore, detail, pro page, matching | active |
| `portfolio_item_tags` | explore and matching enrichment | active |
| `match_requests` | web match submit, mobile service layer | active but uneven |
| `match_results` | web results | active |
| `match_result_rows` | web results | active |
| `saved_portfolios` | service layer only | partially used |
| `contact_requests` | mobile booking/request service | partially used |
| `POST /api/match-run` | web match submit | active |
| `POST /api/notify-request` | web request modal, mobile request modal | active but operationally external |
| `GET /api/notify-status` | diagnostics | active |

### Unused or underused fields / structures

| Item | Current state |
|---|---|
| `saved_portfolios` table | exists, but no saved-tab UI reads from it |
| `contact_requests` on web | no direct usage in `src/` |
| `vision_notes` on `match_requests` | still written as legacy field; newer split fields exist |
| `match_results.payload` | duplicates normalized `match_result_rows`; likely redundant unless needed for snapshot/debug |
| `src/lib/server.ts` | appears unused in current Vite SPA |
| `src/data/mock.ts` | appears unused in live web flow |

## 5. Backend/schema audit

### Core backend structure

The backend is primarily Supabase/Postgres plus private storage buckets and two local Node services.

Confirmed schema sources:
- `supabase/migrations/20260330120000_initial_trustfall_core.sql`
- `supabase/migrations/20260330130000_trustfall_helpers_and_account_triggers.sql`
- `supabase/migrations/20260330140000_trustfall_rls_policies.sql`
- `supabase/migrations/20260330150000_trustfall_storage.sql`
- `supabase/migrations/20260330160000_match_get_matched_schema.sql`
- `supabase/migrations/20260330170000_trustfall_onboarding_mvp.sql`
- `supabase/migrations/20260407180000_portfolio_items_description.sql`
- `supabase/migrations/20260415120000_professionals_request_count.sql`
- `supabase/migrations/20260415130000_portfolio_item_service_metadata.sql`

### Table/model audit

| Table / model | Purpose | Relationships | Usage label | Notes |
|---|---|---|---|---|
| `profiles` | user identity/profile row for `auth.users` | `profiles.id -> auth.users.id` | `Actively used` | contains `account_type`, budgets, `avatar_url` |
| `user_preferences` | onboarding state + categories + extra | `user_preferences.user_id -> auth.users.id` | `Actively used` | main personalization source |
| `professionals` | provider directory / public pro metadata | optionally linked to `auth.users` via `owner_user_id` | `Actively used` | contains display/title/category/city/ratings/booking contacts/published/request_count |
| `portfolio_items` | provider services/look catalog entries | `portfolio_items.professional_id -> professionals.id` | `Actively used` | pricing, images, description, service metadata |
| `portfolio_item_tags` | tag rows per portfolio item | `portfolio_item_id -> portfolio_items.id` | `Actively used` | used in explore/matching |
| `match_requests` | user match submissions | `user_id -> auth.users.id`; optional saved look FK | `Actively used` | includes legacy and newer request fields |
| `match_results` | one result set per request | `match_request_id -> match_requests.id` | `Actively used` | stores status/payload |
| `match_result_rows` | normalized ranked provider/piece rows | FKs to `match_results`, `professionals`, `portfolio_items` | `Actively used` | main web result read model |
| `saved_portfolios` | user favorites | composite relationship to user + item | `Partially used` | services exist; UI mostly ignores it |
| `contact_requests` | booking/contact request records | FKs to user, professional, portfolio item | `Partially used` | used on mobile, not on web |
| storage bucket `portfolio` | pro media | tied to catalog | `Active, but access strategy unclear` | migration creates private bucket |
| storage bucket `client-uploads` | match/request uploads | tied to match/contact rows | `Actively used` | private bucket |
| storage bucket `avatars` | user avatars | tied to `profiles.avatar_url` or path usage | `Actively used` | private bucket |

### Auth/user/role model

Confirmed:
- Supabase Auth is the identity source.
- `profiles.account_type` is the app role field: `client`, `professional`, `admin`.
- user signup trigger populates `profiles`.
- owner-based pro RLS is tied to `professionals.owner_user_id`.

Inferred:
- The repo does not show a full production-grade pro account provisioning flow.
- Role escalation and pro ownership linking likely still require back-office or pro-app workflows outside the current user-facing clients.

### Booking-related structures

Confirmed:
- `contact_requests` is the booking/request table.
- `mobile/services/user/contactRequestService.ts` inserts rows.
- `mobile/components/booking/RequestBookingModal.tsx` can also upload request images and notify via HTTP.

Gaps:
- Web request flow does not write `contact_requests`.
- There is no full booking lifecycle model for confirmed appointments, cancellations, reschedules, payments, or provider-side acceptance workflow in the current user app paths.

### Review/reputation structures

Confirmed:
- `professionals` stores `rating`, `review_count`, and `request_count`.

Missing:
- No review table is present in the migrations reviewed.
- No response-time or verification table/model is present.

### Availability/location/catalog structures

Confirmed:
- `professionals.city` exists.
- `match_requests.location_text` exists.
- `portfolio_items` stores service metadata and publish state.

Missing:
- no structured availability rules table
- no blocked dates table
- no service area / travel radius table
- no geospatial or zip-radius search model
- no explicit `is_active` / `is_approved` / `searchable` separation beyond `published`

### Endpoints/services audit

| Endpoint / service | Purpose | Status |
|---|---|---|
| `server/match-engine.ts` -> `POST /api/match-run` | create or refresh match results for a request | active |
| `server/notifications.mjs` -> `POST /api/notify-request` | notify provider inbox/email/SMS about request | active |
| `server/notifications.mjs` -> `GET /api/health` | health check | active |
| `server/notifications.mjs` -> `GET /api/notify-status` | diagnostics | active |
| PostgREST `.from(...)` calls | main API surface for apps | active |
| RPC functions | no client `.rpc()` usage found | not actively used |
| Supabase Edge Functions | none in repo | not used |

## 6. Live catalog readiness

### Provider identity/display

| Area | What exists today | What is missing / weak | Production-ready requirement |
|---|---|---|---|
| provider ID | `professionals.id` exists and is used | mobile still depends on demo ids + `mobile/lib/catalogIdMap.ts` in some paths | all clients should consume real UUIDs only |
| display name | `professionals.display_name` is used | none critical | keep |
| profile image | no clear dedicated public provider avatar field in storefront reads; mobile pro page uses `getMockProfileAvatarUrl()` | provider image contract is missing/weak | add `profile_image_path/url` to public read model |
| bio/tagline | `professionals.about`, `title` exist | mobile still generates static taglines per category | use DB-backed bio/tagline only |
| category/specialty | `professionals.category`, `portfolio_items.service_type` | specialty/additional specialties are weak | add normalized specialties if needed |

### Provider services

| Area | What exists today | What is missing / weak | Production-ready requirement |
|---|---|---|---|
| service names | `portfolio_items.service_title` | none critical | keep |
| service categories | `category`, `service_type` | no normalized public service catalog model | consider service taxonomy |
| pricing | `price` exists | no currency/min/max/price display type | add pricing contract if variable pricing is needed |
| duration | `duration_minutes` exists | not guaranteed used everywhere | make required for bookable services |
| add-ons | not present | missing | add service add-on model if needed |
| bookable offerings | implied by portfolio items | portfolio item is doing double duty as media + service | split or define public offering/read model |

### Provider media/portfolio

| Area | What exists today | What is missing / weak | Production-ready requirement |
|---|---|---|---|
| images | before/after paths exist | image access path is inconsistent with private bucket setup | standardize signed/public delivery |
| videos | not present | missing | add if required |
| captions | `description` exists | limited usage in ranking/search | keep and expose consistently |
| tags | `portfolio_item_tags` exists | good enough for MVP | keep |
| featured media | not present | missing | add featured flag or storefront ordering rules |
| ordering | `sort_order` exists | works, but no explicit featured logic | keep + optionally add featured |

### Provider location/service area

| Area | What exists today | What is missing / weak | Production-ready requirement |
|---|---|---|---|
| city | `professionals.city` | coarse only | keep |
| zip | not modeled | missing | add zip/postal support if needed |
| travel radius | not modeled | missing | add service area table/fields |
| in-studio/on-location/virtual | not modeled | missing | add service mode fields |
| location filters | text/category filtering only | no real geo filtering | add structured location read model |

### Provider availability/bookability

| Area | What exists today | What is missing / weak | Production-ready requirement |
|---|---|---|---|
| availability rules | none | missing | add provider availability rules table |
| blocked dates | none | missing | add blocked-time/date model |
| next available logic | none | missing | compute from availability |
| instant book vs request | request flow exists only | no real booking mode model | add booking mode per service/provider |
| lead time | none | missing | add service/provider lead time |
| date/time fit | match intake collects preferences | no backend availability matching | add availability-aware match logic |

### Trust/reputation

| Area | What exists today | What is missing / weak | Production-ready requirement |
|---|---|---|---|
| rating | `professionals.rating` | likely denormalized/manual | define source-of-truth review system |
| review count | `professionals.review_count` | no review table | add review model or document source |
| verification | none found | missing | add provider verification flags if needed |
| response time | none found | missing | add derived metric if needed |

### Visibility/publishing

| Area | What exists today | What is missing / weak | Production-ready requirement |
|---|---|---|---|
| active | not explicitly modeled | missing | add `is_active` or equivalent |
| published | `professionals.published`, `portfolio_items.published` | useful but too coarse alone | keep |
| approved | not explicitly modeled | missing | add moderation/approval flag |
| searchable/marketplace visible | implied by `published` | too coarse | add explicit catalog visibility semantics |

## 7. Missing requirements / gap analysis

### Priority-scored gap list

| Missing requirement | Priority | Type | Why it matters | Affects | Risk if ignored | Recommended next action |
|---|---|---|---|---|---|---|
| Replace mobile seed-based match results with live `match_results` / `match_result_rows` consumption | Critical | Backend / Frontend / API | current mobile matching is not using shared backend truth | mobile match flow | users see inconsistent results between clients; impossible to align with pro backend | build mobile results hook equivalent to `src/hooks/useMatchRunResults.ts` |
| Move saved/favorites to `saved_portfolios` in both clients | Critical | Backend / Frontend / State | saved state is device-local and not cross-device | saved tab, explore, profile counts | user data loss, inconsistent experience, impossible pro/catalog analytics | replace local-only save toggles with cloud-backed sync and cache |
| Standardize booking/contact flow around `contact_requests` for both web and mobile | Critical | Backend / API / Frontend | web is notify-only while mobile can write DB | request modal, provider contact flow | no unified request history or lifecycle | create shared request service and make web write `contact_requests` |
| Define public provider catalog contract/read model | Critical | Schema / API | clients currently read raw joined tables and also rely on seed glue | explore, detail, pro page, match | fragile coupling to internal schema and private fields | create a public catalog view or API contract for consumer apps |
| Add provider profile image/public media delivery contract | High | Schema / API | mobile pro page uses mock avatars; storage access strategy is inconsistent | provider detail, cards, explore | poor storefront quality, broken image access risk | add provider image field and standardize public/signed URL generation |
| Replace seed/demo ID bridging (`catalogIdMap`) with real live ids only | High | Frontend / API | demo ids are still embedded in some mobile flows | contact requests, saved, detail routing | silent failures when live data diverges from seed map | remove seed id assumptions from UI state and payloads |
| Add availability/bookability backend structures | High | Schema / Product Logic | current system can request contact but not determine actual bookability | matching, booking, provider detail | cannot support real booking lifecycle | design availability, blocked times, booking mode, lead time models |
| Add lifecycle beyond contact request (accepted, scheduled, cancelled, rescheduled) | High | Schema / Product Logic | `contact_requests` is not a full booking system | booking lifecycle | cannot launch full booking product | define appointments/booking tables or expand request workflow |
| Align web profile with real `profiles` / `user_preferences` | High | Frontend | web profile is mostly placeholder | web profile/settings | low trust, inconsistent account experience | replace `usersSeed[0]` usage with live profile model |
| Remove local-only request history as source of truth | High | State / UX | request history is local storage only | profile requests/history | users lose history across devices | read request history from `contact_requests` |
| Add explicit provider visibility/status fields (`active`, `approved`, `searchable`) | Medium | Schema / Product Logic | `published` is not enough for marketplace operations | catalog ingestion, moderation | unsafe or confusing marketplace visibility | extend provider and item visibility model |
| Add structured location/service area model | Medium | Schema / API | city text is too weak for real discovery and matching | search, match, provider detail | poor relevance and weak filtering | add zip, travel radius, service modes, optional geo fields |
| Resolve storage privacy vs public URL strategy | Medium | Backend / API | buckets are private but some helpers assume public URLs | image rendering, email, explore | broken media delivery or insecure exposure | choose signed URL pipeline or public CDN for catalog media |
| Remove legacy/duplicated match fields (`vision_notes`, `payload` duplication) | Medium | Schema | duplicate representations complicate maintenance | matching, analytics | schema drift and confusing contracts | deprecate legacy fields after client migration |
| Consolidate duplicated web/mobile explore logic | Medium | Frontend / API | duplicated fetch/map logic increases drift risk | explore, detail, personalization | fixes land unevenly across clients | extract shared read model + shared query layer |
| Replace mobile/request/web artificial placeholder UX with real state transitions | Low | UX | some success/loading states are simulated or local only | request modals, mobile match | lower confidence and polish | unify request lifecycle messaging with backend statuses |

### Missing requirements by requested business area

| Capability | What is missing | Why it matters |
|---|---|---|
| live provider catalog | cloud-backed public provider read model; removal of seed dependencies | required for shared pro backend source of truth |
| search/discovery | structured service area, visibility, richer public provider metadata | improves relevance and trust |
| provider detail pages | real provider avatar, bio, specialties, published media ordering, reputation contract | current pages are partly mocked |
| matching | mobile live match integration, availability-aware ranking, unified request inputs | currently inconsistent between clients |
| saved providers | DB-backed saves and history | required for cross-device persistence |
| booking request flow | unified `contact_requests` write path on both clients | needed for reliable provider communication |
| full booking lifecycle | appointment model or richer request-status workflow | required for real booking product |
| App Store launch readiness | reduce seed/mock paths, unify contracts, remove local-only critical state | critical for production trust and supportability |

## 8. Pro backend integration requirements

### What this app should expect from the shared pro backend

#### Public provider fields needed

Recommended public provider catalog contract:
- `provider_id`
- `slug`
- `display_name`
- `title`
- `category`
- `specialties[]`
- `bio`
- `profile_image_url`
- `city`
- `service_area_summary`
- `rating`
- `review_count`
- `request_count`
- `years_experience`
- `is_published`
- `is_active`
- `is_approved`
- `is_searchable`
- `next_available_at` or equivalent derived field

#### Public offering / portfolio fields needed

- `portfolio_item_id`
- `provider_id`
- `service_title`
- `service_type`
- `category`
- `description`
- `price`
- `duration_minutes`
- `media[]` with:
  - `type`
  - `url`
  - `caption`
  - `sort_order`
  - `is_featured`
- `tags[]`
- `is_published`
- `sort_order`

#### Availability / bookability fields needed

- `booking_mode` (`request`, `instant_book`, possibly `request_only`)
- `accepts_new_clients`
- `lead_time_hours`
- `service_modes` (`in_studio`, `on_location`, `virtual`)
- `travel_radius_miles`
- `availability_summary`
- optional derived `next_available_at`

#### Booking/request fields needed

For a shared request contract:
- `request_id`
- `user_id`
- `provider_id`
- `portfolio_item_id`
- `message`
- `preferred_date_text` and/or structured time window
- `client_name`
- `client_email`
- `client_phone`
- `current_photo_path/url`
- `inspiration_image_path/url`
- `status`
- `created_at`
- `updated_at`

### Private provider fields this user app should not directly consume

These should stay private or be excluded from the consumer-facing public catalog contract:
- `owner_user_id`
- internal moderation flags not intended for client use
- direct storage object paths
- internal notes
- private contact channels unless explicitly intended to be public
- service-role-only fields / operational metadata

### Where the current app still uses fake/static/mock data

| Area | Current local assumption |
|---|---|
| mobile match results | `mobile/features/matching/rankProfessionals.ts` over `professionalsSeed` |
| mobile saved resolution | `mobile/data/seed.ts` + local saved ids |
| mobile pro profile presentation | mock avatar and static tagline generation |
| web profile | `src/data/seed.ts` user seed |
| local request history | local saved providers in both clients |
| mobile demo id bridging | `mobile/lib/catalogIdMap.ts` |

### Where the data model should be reshaped

1. Create a public read model for the consumer apps.
   - likely a view or API contract over `professionals`, `portfolio_items`, and `portfolio_item_tags`
   - should expose only public, marketplace-safe fields

2. Separate service/bookable offering from portfolio media if needed.
   - today `portfolio_items` is acting as both a catalog/media unit and a service offering
   - this may be good enough for MVP, but it is a weak long-term contract for real booking

3. Standardize request history and saved state on backend truth.
   - local persistence can remain as cache, not source of truth

4. Give mobile the same live catalog + live matching contract as web.
   - avoid per-client contract drift

## 9. Old user app comparison checklist

This repo does not contain the old user app, so this section is intentionally comparison-ready rather than pretending to prove historical facts.

### What exists now

- shared Supabase-backed onboarding contract across web and mobile
- live web catalog from `portfolio_items` + `professionals`
- web live match submission + result polling
- mobile partial live catalog plus seed fallback
- mobile DB-backed `contact_requests` path
- local-only saves and request history in both clients

### What likely existed in the older app

`Inferred / needs manual comparison`:
- stronger dependence on in-app seeds or older local structures
- a simpler or older match contract based on legacy notes fields
- different assumptions around pro-connected catalog ids
- potentially more direct coupling between user app and pro app data contracts if older flows were previously wired together

### What should be checked first when comparing

| Compare area | Why |
|---|---|
| saved/favorites data contract | current app is still local-only, so older cloud-connected behavior may have been lost |
| request/booking persistence | current web path is not writing `contact_requests`; older app may have had a different integration |
| provider public profile contract | current mobile still uses mock avatar/tagline logic |
| matching source of truth | current mobile uses seed ranking while web uses backend result rows |
| provider ID assumptions | current mobile still has demo-id bridging via `catalogIdMap.ts` |
| onboarding payload shape | shared onboarding contract exists now; older app may have used different fields |

### Functionality/data contracts that may have been lost or simplified

| Item | Status |
|---|---|
| cloud-backed saved/favorites | `Confirmed missing in current UI usage` |
| unified request history | `Confirmed missing in current UI usage` |
| mobile live matching parity | `Confirmed missing` |
| real provider profile image/public storefront contract | `Confirmed weak/incomplete` |
| fully shared provider catalog contract between user and pro systems | `Confirmed not formalized here` |

### Integration assumptions that may be different now

| Assumption | Current repo state |
|---|---|
| user app can rely on seed ids | no longer safe for live backend |
| request flow can be local or notify-only | still true in places, but incompatible with a merged pro backend |
| matching can be client-local | still true on mobile, but not aligned with shared backend truth |
| one table shape can serve both raw backend and public catalog | possible today, but fragile |

## 10. Recommended next steps in priority order

1. Make the backend the source of truth for saved state and request history.
   - wire both clients to `saved_portfolios` and `contact_requests`
   - keep local storage only as cache/offline fallback

2. Bring mobile onto the same live matching pipeline as web.
   - submit `match_requests`
   - poll `match_results` / `match_result_rows`
   - remove `professionalsSeed` ranking path from user-facing results

3. Create a consumer-safe public provider catalog contract.
   - either a Supabase view or a dedicated read API
   - include provider identity, public media, service metadata, visibility, and reputation fields

4. Standardize provider storefront presentation.
   - replace mock avatars/taglines
   - define real provider image + bio + specialty fields

5. Decide whether `portfolio_items` remains both service + media model, or split those responsibilities.
   - if instant booking or sophisticated services are planned, this likely needs separation

6. Add booking lifecycle structures beyond contact requests.
   - appointment or booking entities
   - provider acceptance / decline / reschedule
   - availability-aware matching and request handling

7. Align storage/media delivery.
   - standardize signed/public URL handling across web, mobile, and notification emails

8. Remove legacy and duplicated contracts once the new paths are stable.
   - deprecate local-only request history
   - deprecate local-only saved state
   - clean up legacy match note fields and duplicate result payloads

## Final summary

- What this app currently is:
  - a mixed-maturity dual-client Trustfall user platform with a real Supabase backend, a live web matching/catalog path, and a mobile app that still blends live backend usage with seed/local behavior

- What this app is missing:
  - unified saved state
  - unified request history
  - mobile live matching parity
  - a formal public provider catalog contract
  - availability/bookability structures
  - full booking lifecycle support
  - consistent media/profile storefront fields

- Whether it is ready to consume a live pro-fed catalog:
  - `Partially`
  - the backend schema is close enough to support it, but the client contracts are not yet clean enough or consistent enough, especially on mobile

- What to compare first against the old user app:
  - saved/favorites persistence
  - booking/request persistence
  - provider ID assumptions
  - match result source of truth
  - provider public profile/media contract
