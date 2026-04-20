# New User App Pre-Merge Audit

Date: 2026-04-18

Scope: current user-facing web app under `src/`, mobile app under `mobile/`, and the shared user-side backend integrations they use today. This audit is specifically for reconnecting the new user app to a shared pro backend where the pro backend becomes the source of truth for public provider/catalog data, while the user app owns user-side writes such as onboarding, saves, requests, and match flows.

Evidence standard:
- Confirmed: directly verified in the current codebase.
- Inferred: likely true from code structure and naming, but not proven from one file alone.

## 1. Executive Summary

This app is **partially ready** to reconnect to the pro backend, but it is **not ready for a clean reconnect or App Store-quality launch without a final contract pass and targeted cleanup**.

What is already in good shape:
- Core Supabase-backed flows now exist for auth, onboarding, saved persistence, request persistence, match submission, match processing, and match result retrieval.
- The shared service layer is materially stronger than before. The main user-side write paths are centralized in `src/services/onboarding/onboardingApi.ts`, `src/lib/saved/service.ts`, `src/lib/requests/service.ts`, and `src/lib/match/submitMatchFlowShared.ts`.
- Mobile request history/detail and match results are now reading real backend data, not placeholder local-only lists.
- Web and mobile both depend on the same request/match persistence primitives, which is a good base for reconnecting to a shared pro backend.

Biggest blockers:
1. **Mixed live + seed/demo behavior still exists on production-facing surfaces**, especially mobile Explore, mobile provider detail/profile, mobile Saved, and web Profile.
2. **The app is still tightly coupled to raw Supabase table shapes and PostgREST joins**, rather than consuming a stable public provider/catalog contract from the pro backend.
3. **There are still cross-platform behavior mismatches** in auth bootstrap, profile truth, request UX defaults, and fallback handling.

Biggest risks:
- Users can still see seeded or demo-derived provider presentation in mobile while writing real saves/requests against live backend rows.
- Web profile still shows seeded account identity while other parts of the same session are live.
- The hosted backend appears to still have some legacy schema drift, and the user app already contains compatibility shims for that drift. Reconnecting without locking the contract will keep that fragility alive.
- Operational dependency on externally hosted match-run and notify endpoints remains a launch risk.

What should be fixed first:
1. Remove dangerous production-path seed/demo dependencies from mobile catalog/profile/saved flows and web profile/account surfaces.
2. Define a stable shared read contract for public providers/catalog/media/trust signals, instead of letting the user app read raw implementation tables directly.
3. Align mobile/web behavior around account truth, auth/session assumptions, request UX defaults, and fallback/error handling.

Bottom line: **the foundation is solid enough to proceed with reconnection planning, but reconnecting now without cleanup would be messy, high-risk, and likely to preserve prototype-era behavior in production.**

## 2. Feature Audit

| Feature | Purpose | Current implementation state | Mode today | Backend dependencies | Reconnect readiness |
|---|---|---|---|---|---|
| Auth | Sign in, sign up, bootstrap a usable session | Web and mobile both use Supabase Auth; mobile also supports Google OAuth; web can bootstrap anonymous sessions in some flows | Mostly live backend | `supabase.auth`, shared `ensureSupabaseAuthSession` on web, mobile `googleOAuth.ts` | Partially ready |
| Onboarding | Capture account setup and user preferences | Shared service layer is strong and used by both clients; mobile adds extra route-level helpers | Live backend with local UX helpers | `profiles`, `user_preferences`, onboarding extra JSON, avatar storage | Ready |
| Explore | Browse public provider/catalog inventory | Web is effectively live-only; mobile still falls back to seeded portfolio feed when remote feed is absent | Mixed | `portfolio_items`, `professionals`, `portfolio_item_tags`, public portfolio media | Partially ready |
| Provider detail/profile | Show a piece detail or a provider storefront | Web is mostly live; mobile still composes from mixed remote feed, seed fallback, and mock avatar/profile presentation | Mixed | `portfolio_items`, `professionals`, saves, requests | Not ready |
| Saved / favorites | Persist saved looks and saved pros | Shared backend service exists and is used; both clients still merge local caches and legacy/demo IDs | Mixed | `saved_portfolios`, `saved_professionals`, local storage / AsyncStorage caches, demo ID normalization | Partially ready |
| Matching | Capture a match request and start ranking | Web and mobile now both submit real `match_requests`, upload images, and trigger the backend match engine | Live backend with local UX state | `match_requests`, `client-uploads`, match-run endpoint | Partially ready |
| Match results | Show ranked providers after backend processing | Web and mobile both poll real `match_results` / `match_result_rows` and render ranked providers | Live backend | `match_results`, `match_result_rows`, joined `portfolio_items` + `professionals` | Ready |
| Request flow | Send a provider request from Explore/Saved/Match | Shared persistence is real; DB write happens before notify side-effects; web request modal still uses seeded client contact defaults | Mixed | `contact_requests`, `client-uploads`, notify endpoint, signed URLs | Partially ready |
| Request history/detail | Show previously sent requests | Mobile has dedicated live history/detail routes; web only exposes recent requests inline on profile | Live backend | `contact_requests`, signed request asset URLs | Partially ready |
| Profile | Show account identity, preferences, stats, requests | Mobile is mostly live; web profile still shows seeded account identity and preferences | Mixed | `profiles`, `user_preferences`, `contact_requests`, saved state, avatar storage | Not ready |
| Settings | Sign out and support/account links | Minimal but functional | Mostly live backend | `supabase.auth.signOut`, support/mail composer on mobile | Ready |

Feature notes:

### Auth
- Confirmed: web auth is in `src/pages/SignInPage.tsx`, `src/pages/SignUpPage.tsx`, `src/lib/client.ts`, and auth gating in `src/components/layout/RootRoute.tsx` / `RequireOnboardingComplete.tsx`.
- Confirmed: mobile auth is in `mobile/app/welcome.tsx`, `mobile/app/sign-in.tsx`, `mobile/app/sign-up.tsx`, `mobile/lib/supabase.ts`, and `mobile/lib/auth/googleOAuth.ts`.
- Confirmed: web match/bootstrap logic can create an anonymous session via `src/lib/auth/ensureSupabaseSession.ts`.
- Confirmed: mobile match submission in `mobile/hooks/useMatchSubmission.ts` requires an already-authenticated user and does not call the anonymous bootstrap helper.
- Risk: auth expectations differ by platform in ways that matter during reconnect and QA.

### Onboarding
- Confirmed: `src/services/onboarding/onboardingApi.ts` is the core write/read contract for `profiles` and `user_preferences`.
- Confirmed: route destination is based on `onboarding_completed_at` through `src/lib/onboarding/bootstrapDestination.ts`.
- Confirmed: mobile uses the same shared API through `mobile/lib/onboarding.ts`, with additional mobile-only helpers like `mobile/lib/profilePreferences.ts` and `mobile/lib/match/getDeviceLocation.ts`.

### Explore
- Confirmed: web uses `src/hooks/useExplorePortfolio.ts` and `src/lib/explore/fetchPublishedPortfolio.ts`.
- Confirmed: mobile uses `mobile/hooks/useExplorePortfolio.ts` and `mobile/lib/explore/fetchPublishedPortfolio.ts`.
- Confirmed: mobile Explore falls back to `mobile/lib/buildPortfolioFeed.ts` / `mobile/data/seed.ts` when remote results are unavailable or empty.
- Risk: this is acceptable for local development but dangerous as a production-path behavior.

### Provider detail / provider profile
- Confirmed: web detail/profile surfaces are live-backed through `src/pages/ExploreDetailPage.tsx`, `src/pages/ProfessionalPage.tsx`, and related hooks under `src/hooks/`.
- Confirmed: mobile detail/profile routes still use `resolvePortfolioItemId`, `resolveProfessionalId`, `professionalsSeed`, and `mobile/lib/mockProfileAvatar.ts` in real route logic.
- Risk: mobile still does not consume a clean shared public provider profile contract.

### Saved / favorites
- Confirmed: saves persist through `src/lib/saved/service.ts`.
- Confirmed: both web `src/hooks/SavedProvider.tsx` and mobile `mobile/contexts/SavedProvider.tsx` merge backend truth with local cache and request-submission activity lists.
- Confirmed: saved normalization still depends on `src/lib/demoCatalogIds.ts` / `mobile/lib/catalogIdMap.ts`.
- Risk: local/demo compatibility logic is still in the production code path.

### Matching
- Confirmed: shared submit path lives in `src/lib/match/submitMatchFlowShared.ts`.
- Confirmed: mobile wraps that path in `mobile/hooks/useMatchSubmission.ts`.
- Confirmed: web uses `src/lib/match/submitMatchFlow.ts` and results polling via `src/hooks/useMatchRunResults.ts`.
- Confirmed: mobile uses `mobile/hooks/useMatchRunResults.ts` and `mobile/app/(tabs)/match/results.tsx`.
- Confirmed: mobile image upload for requests and match flow was recently fixed to upload real bytes through `mobile/lib/localImageAttachment.ts`, after zero-byte storage uploads were observed.
- Risk: the flow is now structurally correct, but remains operationally dependent on the match engine URL and deployment.

### Match results
- Confirmed: both clients use `src/lib/match/fetchMatchResults.ts` plus `src/lib/match/mapMatchRowsToRanked.ts`.
- Confirmed: the UI model is portfolio-first and grouped back into provider cards.
- This is the cleanest reconnect-ready area in the app.

### Request flow
- Confirmed: `src/lib/requests/service.ts` is the source of truth for request persistence, image upload, notification-state patching, and history/detail reads.
- Confirmed: mobile request modal (`mobile/components/booking/RequestBookingModal.tsx`) now persists real rows and uploads real request images before notify.
- Confirmed: web request modal (`src/components/explore/RequestModal.tsx`) also uses `submitRequest`, but still seeds contact defaults from `usersSeed[0]`.
- Confirmed: notifications are not the source of truth; DB writes happen first, then notify side-effects are attempted via `src/lib/requests/notify.ts` or `mobile/lib/notifyContactRequest.ts`.
- Risk: notify URL deployment remains a launch and reconnect concern.

### Request history / detail
- Confirmed: `src/hooks/useRequestHistory.ts` and `useRequestDetail` are shared.
- Confirmed: mobile routes `mobile/app/profile-requests.tsx` and `mobile/app/profile-request/[id].tsx` are live backend readers.
- Confirmed: web still lacks a dedicated request history/detail route; it only surfaces recent requests on profile.

### Profile
- Confirmed: mobile profile uses `mobile/lib/profileScreenData.ts`, `mobile/lib/profilePreferences.ts`, and `useRequestHistory`.
- Confirmed: web profile in `src/pages/ProfilePage.tsx` still uses `usersSeed[0]` for visible identity, categories, and budget while request history itself is live.
- This is one of the clearest remaining trust blockers.

### Settings
- Confirmed: low-complexity auth/settings surface.
- Confirmed: mobile support is device-mail based (`mobile/app/support.tsx`) rather than a backend ticketing surface.

## 3. Screen-By-Screen Merge-Readiness Table

Status key:
- Ready: can reconnect with minimal change.
- Partially ready: backend-connected but still mixed or fragile.
- Not ready: still depends on seed/local/demo assumptions in ways that would complicate reconnect.

| Screen / route | Purpose | Data source today | Reads / writes today | Fake / local / seed assumptions | After reconnect should read / write | Status |
|---|---|---|---|---|---|---|
| `src/components/layout/RootRoute.tsx` | Web boot redirect | Live auth + onboarding | Reads auth session, `profiles`, `user_preferences` | None significant | Same | Ready |
| `src/pages/SignInPage.tsx` | Web sign in | Live auth | Writes auth session | None significant | Same | Ready |
| `src/pages/SignUpPage.tsx` | Web sign up | Live auth | Writes auth user | None significant | Same | Ready |
| `src/pages/OnboardingPage.tsx` | Web onboarding | Shared live onboarding API | Reads/writes `profiles`, `user_preferences` | Local form state only | Same | Ready |
| `src/pages/ExplorePage.tsx` | Web catalog browse | Live backend | Reads `portfolio_items`, `professionals`, `portfolio_item_tags`; local recent-search storage | Local search persistence only | Prefer a stable public catalog read model | Partially ready |
| `src/pages/ExploreDetailPage.tsx` | Web piece detail | Live backend | Reads item/detail bundle; writes saves/requests through shared services | None major | Same public contract + request write model | Partially ready |
| `src/pages/ProfessionalPage.tsx` | Web provider profile | Live backend | Reads provider portfolio bundle | None major | Shared public provider profile model | Partially ready |
| `src/pages/SavedPage.tsx` | Web saved list | Mixed live + local cache | Reads saved rows and live catalog; writes saves | Legacy/demo ID normalization and local merge | Saved backend truth + public catalog only | Partially ready |
| `src/pages/MatchPage.tsx` | Web match intake | Live backend + local wizard/session state | Writes `match_requests`, uploads images, triggers match engine | `usersSeed[0]` still used for suggestion context | Same backend write path, remove seeded personal hints | Partially ready |
| `src/pages/MatchResultsPage.tsx` | Web match results | Live backend | Reads `match_results`, `match_result_rows` and launches request modal | Session storage only for UX continuity | Same | Ready |
| `src/pages/ProfilePage.tsx` | Web profile | Mixed live + seed identity | Reads live requests, saved state; writes sign-out | `usersSeed[0]` for visible account truth | Read real `profiles` / `user_preferences` | Not ready |
| `src/pages/SettingsPage.tsx` | Web settings | Live auth | Writes sign-out | None | Same | Ready |
| `mobile/app/index.tsx` | Mobile boot redirect | Live when configured, fallback behavior when not | Reads auth session, onboarding state, AsyncStorage route hint | Placeholder Supabase client pattern when env is missing | Same, but avoid shipping misconfigured live-like behavior | Partially ready |
| `mobile/app/welcome.tsx` | Mobile entry/auth | Live auth when configured | Writes auth session / OAuth | Unconfigured-env branch | Same | Partially ready |
| `mobile/app/sign-in.tsx` | Mobile sign in | Live auth | Writes auth session | None major | Same | Ready |
| `mobile/app/sign-up.tsx` | Mobile sign up | Live auth | Writes auth user | Navigation / product parity differences vs web | Same | Partially ready |
| `mobile/app/onboarding.tsx` | Mobile onboarding | Shared live onboarding API + local helpers | Reads/writes `profiles`, `user_preferences`, avatar storage | Local location search catalog and device location helpers | Same backend writes, align UX contracts where needed | Partially ready |
| `mobile/app/(tabs)/explore/index.tsx` | Mobile Explore | Mixed remote + seed fallback | Reads published portfolio feed; local recent searches | `buildPortfolioFeed()` seed fallback | Public provider/catalog read model only in production | Not ready |
| `mobile/app/(tabs)/explore/[id].tsx` | Mobile piece detail | Mixed remote + seed detail composition | Reads feed/detail and writes saves/requests | Seed item/profile resolution helpers | Shared public detail model only | Not ready |
| `mobile/app/pro/[id].tsx` | Mobile provider profile | Mixed remote + seed + mock presentation | Reads provider detail, writes saves/requests, routes into match | `professionalsSeed`, mock avatar URLs, fallback composition | Shared provider profile/storefront contract | Not ready |
| `mobile/app/(tabs)/saved.tsx` | Mobile saved | Mixed live + local cache + seed resolution | Reads saved rows + remote feed; writes saves | Seed fallback for card resolution | Saved backend truth + public catalog only | Not ready |
| `mobile/app/(tabs)/match/index.tsx` | Mobile match intake | Live backend + local draft + dev fallback | Writes `match_requests`, uploads images, triggers match engine | Local draft state, `__DEV__` seed fallback when feed absent | Same backend path; keep only harmless draft UX | Partially ready |
| `mobile/app/(tabs)/match/results.tsx` | Mobile match results | Live backend + local draft context | Reads `match_results`, `match_result_rows`; opens request modal | Local draft only for summary/prefill | Same | Ready |
| `mobile/app/(tabs)/profile.tsx` | Mobile profile | Mostly live backend | Reads `profiles`, `user_preferences`, requests, saved state; writes avatar changes | Mock avatar fallback is display-only | Same | Ready |
| `mobile/app/profile-requests.tsx` | Mobile request history | Live backend | Reads `contact_requests` | None significant | Same | Ready |
| `mobile/app/profile-request/[id].tsx` | Mobile request detail | Live backend | Reads one `contact_requests` row + signed assets | None significant | Same | Ready |
| `mobile/app/profile-onboarding-preferences.tsx` | Mobile onboarding prefs editor | Live backend | Reads/writes onboarding preferences | No web counterpart | Same backend contract; ideally shared product behavior | Partially ready |
| `mobile/app/profile-personal-preferences.tsx` | Mobile personal prefs editor | Mixed live + local derived activity | Reads profile data; derives activity from local saved/request submission caches | Local request submission activity still influences product behavior | Should derive from canonical backend truth or analytics | Partially ready |
| `mobile/app/settings.tsx` | Mobile settings | Live auth | Writes sign-out | None | Same | Ready |
| `mobile/app/support.tsx` | Mobile support | Local/device support flow | Reads profile summary; opens device mail composer | No backend support ticket model | Optional product decision | Can wait |

## 4. Data Dependency Map

### Screen-to-data map

| Feature / screen | Reads | Writes | Hooks / services | Image / storage usage | Local storage / seed / mock usage |
|---|---|---|---|---|---|
| Auth | Supabase auth session/user | Supabase auth session/user | `src/lib/client.ts`, `mobile/lib/supabase.ts`, `src/lib/auth/ensureSupabaseSession.ts`, `mobile/lib/auth/googleOAuth.ts` | None | Mobile placeholder client if env missing |
| Onboarding | `profiles`, `user_preferences` | `profiles`, `user_preferences`, avatar storage | `src/services/onboarding/onboardingApi.ts`, `src/onboarding/*`, `mobile/lib/profilePreferences.ts` | `avatars` bucket for profile photo | Local step state, route hints, location catalog |
| Explore web | `portfolio_items`, `professionals`, `portfolio_item_tags` | None | `src/hooks/useExplorePortfolio.ts`, `src/lib/explore/fetchPublishedPortfolio.ts` | Public portfolio URLs | Local recent searches |
| Explore mobile | Same remote tables | None | `mobile/hooks/useExplorePortfolio.ts`, `mobile/lib/explore/fetchPublishedPortfolio.ts` | Public portfolio URLs | Seed fallback via `mobile/lib/buildPortfolioFeed.ts` |
| Provider detail/profile | `portfolio_items`, `professionals` | Saves, requests | Web detail/profile hooks and route files; mobile route-level composition | Public portfolio media; request image uploads via modal | Mobile seed fallback and mock avatar usage |
| Saved | `saved_portfolios`, `saved_professionals`, live catalog feed | `saved_portfolios`, `saved_professionals` | `src/lib/saved/service.ts`, `src/hooks/SavedProvider.tsx`, `mobile/contexts/SavedProvider.tsx` | None directly | localStorage/AsyncStorage cache, demo ID normalization |
| Match intake | Saved catalog feed, auth session | `match_requests`, storage uploads | `src/lib/match/submitMatchFlowShared.ts`, `src/lib/match/insertMatchRequest.ts`, `mobile/hooks/useMatchSubmission.ts` | `client-uploads/{user}/match-requests/...` | Web session storage UX; mobile AsyncStorage draft; web seed hint usage |
| Match results | `match_results`, `match_result_rows`, joined `portfolio_items` and `professionals` | None | `src/hooks/useMatchRunResults.ts`, `src/hooks/useMatchRunResultsClient.ts`, `src/lib/match/fetchMatchResults.ts` | Public portfolio URLs; modal request image prefill | Session/AsyncStorage used only for request summary/prefill |
| Request modal / request flow | `profiles` / session prefill, `contact_requests` | `contact_requests`, request image uploads, notify state patch | `src/lib/requests/service.ts`, `src/lib/requests/notify.ts`, `mobile/lib/notifyContactRequest.ts`, request modals | `client-uploads/{user}/contact-requests/...`, signed URLs for request detail | Web seeded contact defaults; mobile demo prefill only when Supabase absent |
| Request history/detail | `contact_requests` + signed asset URLs | None | `src/hooks/useRequestHistory.ts`, `src/lib/requests/service.ts`, mobile history/detail routes | Signed private request asset URLs | None major |
| Profile web | Request history, saved counts | Sign-out only | `src/pages/ProfilePage.tsx`, `useRequestHistory`, `useSaved` | None | `usersSeed[0]` for visible identity/prefs |
| Profile mobile | `profiles`, `user_preferences`, `contact_requests`, saved counts | Avatar updates, preference writes | `mobile/lib/profileScreenData.ts`, `mobile/lib/profilePreferences.ts`, `useRequestHistory` | Signed `avatars` URLs | Mock avatar fallback only |
| Settings/support | Auth session, profile summary | Sign-out only | settings routes, support route | Device mail composer on mobile | No major fake dependency |

### Shared web/mobile logic and duplication

| Area | Shared contract | Meaningful divergence |
|---|---|---|
| Onboarding | Shared through `src/services/onboarding/onboardingApi.ts` and `src/onboarding/*` | Mobile adds more route-level helpers and editors |
| Saved persistence | Shared through `src/lib/saved/service.ts` | Different route-level fallback and feed-resolution behavior |
| Match submit/results | Shared through `src/lib/match/*` and `src/hooks/useMatchRunResultsClient.ts` | Web uses session storage UX helpers; mobile uses AsyncStorage draft and Expo env for engine URL |
| Request persistence/history | Shared through `src/lib/requests/service.ts` and `src/hooks/useRequestHistory.ts` | Mobile has dedicated history/detail screens; web only shows recent slice |
| Profile/account | Shared auth base only | Web still shows seeded identity while mobile is live-backed |
| Explore | Parallel but similar fetchers/constants | Mobile still retains production-path seed fallback |

## 5. Live vs Fake Inventory

### Harmless temporary UI fallback

| Item | Location | Why it is mostly harmless |
|---|---|---|
| Mock avatar fallback | `mobile/lib/mockProfileAvatar.ts`, `mobile/lib/profileScreenData.ts` | Display-only fallback when no avatar URL exists |
| Match draft persistence | `mobile/contexts/MatchDraftContext.tsx`, `src/lib/match/resultsSession.ts`, `src/utils/matchUploadSession.ts` | UX continuity only; backend remains source of truth for results |
| Recent-search storage | `mobile/constants/storage-keys.ts`, `src/pages/ExplorePage.tsx` | Convenience only |
| Onboarding route hints | `src/lib/onboarding/routeCache.ts`, `mobile/app/index.tsx` | UX-only fallback during transient boot failures |

### Dangerous production-path dependency

| Item | Location | Why it matters |
|---|---|---|
| Mobile Explore seed fallback | `mobile/app/(tabs)/explore/index.tsx`, `mobile/lib/buildPortfolioFeed.ts` | Users can browse non-live providers while the app otherwise feels connected |
| Mobile provider detail/profile seed composition | `mobile/app/(tabs)/explore/[id].tsx`, `mobile/app/pro/[id].tsx` | Public provider identity is not sourced from a single real backend contract |
| Mobile Saved resolving against seed feed | `mobile/app/(tabs)/saved.tsx` | Real saved rows can still be presented through fallback demo content |
| Web profile using seeded account identity | `src/pages/ProfilePage.tsx` | User-visible trust issue; account screen can contradict real backend state |
| Web request modal seeded client defaults | `src/components/explore/RequestModal.tsx` | Requests can start from wrong name/email/phone defaults |
| Demo ID normalization in runtime logic | `src/lib/demoCatalogIds.ts`, `mobile/lib/catalogIdMap.ts` | Production logic still carries migration-era demo assumptions |
| Local request submissions as pseudo-behavioral truth | `src/hooks/SavedProvider.tsx`, `mobile/contexts/SavedProvider.tsx`, `mobile/app/profile-personal-preferences.tsx` | Preferences/activity can drift from canonical request history |
| Placeholder mobile Supabase client | `mobile/lib/supabase.ts` | Misconfigured builds can still boot in a misleading semi-functional state |
| Notify side-channel | request modals + notify helpers + `server/notifications.mjs` | “Sent” UX still depends on a second operational service after DB persistence |

### Seed / mock / local inventory by type

#### Seed data
- `src/data/seed.ts`
- `mobile/data/seed.ts`
- `mobile/lib/buildPortfolioFeed.ts`
- `usersSeed` use in `src/pages/ProfilePage.tsx`
- `usersSeed` use in `src/components/explore/RequestModal.tsx`
- `usersSeed` suggestion context in `src/pages/MatchPage.tsx`

#### Demo IDs / canonicalization bridge
- `src/lib/demoCatalogIds.ts`
- `mobile/lib/catalogIdMap.ts`

#### Local-only caches / state
- Web `SavedProvider` local cache and `requestSubmissions` in `src/hooks/SavedProvider.tsx`
- Mobile `SavedProvider` local cache and `requestSubmissions` in `mobile/contexts/SavedProvider.tsx`
- Web match session helpers in `src/lib/match/resultsSession.ts` and `src/utils/matchUploadSession.ts`
- Mobile match draft in `mobile/contexts/MatchDraftContext.tsx`
- Explore recent searches in web/mobile

#### Mock / generated presentation
- `mobile/lib/mockProfileAvatar.ts`
- provider presentation fallback in mobile profile/storefront routes

### Key distinction

- Harmless temporary fallback: UI continuity helpers, route hints, draft/session recovery, placeholder avatars.
- Dangerous production dependency: anything that changes what real providers/users/requests a user sees or sends.

## 6. Backend Contract Audit

### A. User / account data

**What exists now**
- Auth is Supabase-backed on both clients.
- `profiles` and `user_preferences` are the effective user/account truth through `src/services/onboarding/onboardingApi.ts`.
- Onboarding completion and route gating are already backend-driven.

**What is missing or fragile**
- Web profile does not consume the same account truth as mobile.
- Web request modal still seeds contact defaults from demo data instead of session/profile data.
- Mobile and web do not share the same assumptions around anonymous bootstrap and auth availability during match submission.

**What is too tightly coupled**
- Route gating and preferences are fine; the problem is not the tables themselves but the inconsistent route-level consumers.

**What should come from the pro backend later**
- Nothing major beyond ensuring the user app consumes a single, canonical account/profile contract for itself.

### B. Provider / catalog data

**What exists now**
- Current read model is effectively raw PostgREST over `portfolio_items`, `professionals`, and `portfolio_item_tags`.
- Web catalog/profile surfaces are already reading real backend data.
- Public portfolio media is already a coherent concept.

**What is missing**
- A stable public provider/catalog contract that the user app can depend on without caring about implementation tables.
- A stable provider profile/read model for storefront pages, trust signals, media ordering, visibility, and service metadata.

**What is too tightly coupled**
- `fetchPublishedPortfolio` and `fetchMatchResults` depend directly on raw select strings and nested join shapes.
- Client code contains compatibility branches for missing columns such as `request_count`, `service_type`, `duration_minutes`, and `description`.

**What should come from the pro backend later**
- Public provider identity
- Public provider visibility and publish state
- Portfolio/media contract
- Pricing/service metadata contract
- Trust signals such as ratings/request counts
- Search / filter friendly read model

### C. Matching data

**What exists now**
- Real `match_requests`
- Real image uploads to `client-uploads`
- Real engine trigger endpoint
- Real `match_results` and `match_result_rows`
- Shared client polling and result mapping

**What is missing**
- A more explicit published contract for match input and match output.
- Clear operational ownership of the match engine and its deployment model.

**What is too tightly coupled**
- Result rendering depends on joined `portfolio_items!inner(professionals!inner(...))`.
- The app assumes the ranking model returns enough row-level data to reconstruct provider cards client-side.

**What should come from the pro backend later**
- Stable match request schema
- Stable result-row schema
- Potential server-owned read model for “top ranked providers with pieces” to reduce client join logic

### D. Request data

**What exists now**
- Real `contact_requests`
- Shared request history/detail reads
- Private request image uploads with signed URLs
- Notification-state patching after notify side-effects

**What is missing**
- Full web parity for request history/detail routes
- A cleaner notify contract and deployment story
- Full removal of legacy-schema compatibility once the hosted backend is fully migrated

**What is too tightly coupled**
- Request service has to compensate for legacy missing columns and legacy status shapes.
- Product behavior still mixes canonical request rows with local request-submission caches for some preference/activity views.

**What should come from the pro backend later**
- Stable request lifecycle/status model
- Public/provider-facing request read model
- A clean attachment/media contract
- Potential server-owned provider notification workflow

## 7. Merge-Readiness Gaps

| Gap | Why it matters | What it affects | Severity | Recommended next action |
|---|---|---|---|---|
| Mixed live + seed mobile catalog/profile behavior | Users can see non-live providers in production-feeling flows | Explore, provider profile, Saved, request targeting | Critical | Remove production-path seed fallback; keep demo content only behind dev/demo mode |
| Web profile still uses seeded account identity | Creates obvious trust break and inconsistent account truth | Web profile, perceived account correctness | Critical | Replace `usersSeed` usage with real `profiles` / `user_preferences` |
| No stable shared public provider/catalog contract | Reconnect will keep user app coupled to backend implementation details | Explore, provider pages, match results, Saved resolution | High | Define public read model/API contract before reconnecting |
| Runtime demo ID bridge in core logic | Keeps migration-era assumptions in production paths | Saves, requests, routes, Saved resolution | High | Remove once real catalog IDs are canonical everywhere |
| Request flow still partially mixed with local submission cache | App behavior can diverge from canonical request history | Profile activity, personal preferences, SavedProvider | High | Decide whether local request submission cache is only UX metadata or should be removed |
| Web request modal seeded contact defaults | Real request flow can begin with wrong user identity fields | Web request creation | High | Switch to live prefill from auth/profile/session |
| Mobile/web auth bootstrap mismatch | QA and reconnect behavior differ by platform | Match submit, first-run guest flows | Medium | Align policy for anonymous bootstrap or remove divergence intentionally |
| Raw-table coupling and legacy schema compatibility shims | Schema changes stay risky and expensive | Explore, requests, match results | Medium | Lock contracts and prune compatibility branches once backend is migrated |
| Operational dependency on match-run and notify services | A “connected” app can still fail because secondary services are down/misconfigured | Matching, request delivery | Medium | Add explicit deployment checklist, health checks, and better client-side status handling |
| Saved service has a likely missing-table error bug | Error handling can mask real saved table issues | Saved persistence | Low | Fix `saved_portfolios` missing-table check in `src/lib/saved/service.ts` |

## 8. Fix-Before-Reconnect Priorities

### Must fix before reconnecting

1. Remove production-path seed/demo dependencies from:
   - `mobile/app/(tabs)/explore/index.tsx`
   - `mobile/app/(tabs)/explore/[id].tsx`
   - `mobile/app/pro/[id].tsx`
   - `mobile/app/(tabs)/saved.tsx`
   - `src/pages/ProfilePage.tsx`
2. Replace web seeded account/request defaults with real session/profile-backed values.
3. Define and document a stable public provider/catalog contract for the user app.
4. Freeze the request and matching contracts that the user app expects from the backend.
5. Decide how user-side request activity should work: canonical `contact_requests` only, or canonical rows plus clearly non-authoritative local UX metadata.

### Can fix during reconnecting

1. Align mobile/web auth/session bootstrap expectations.
2. Consolidate duplicate web/mobile route-level logic around provider profile/detail composition.
3. Remove legacy schema compatibility code paths once the hosted backend is fully migrated.
4. Add web request history/detail routes if product parity matters during reconnect.

### Can wait until after reconnecting

1. Dedicated support/ticketing backend instead of mail composer.
2. Better real-time or push-style match completion UX.
3. Product polish around request statuses, provider communication, and richer trust signals.

## 9. App Store Readiness Notes

### What mobile currently gets wrong or inconsistently

- Mobile can still surface seeded/demo provider presentation in real user flows.
- Match and request success depend on separately hosted services, not just Supabase.
- Provider profile presentation still uses mock avatars and mixed data composition.
- Some account/preferences flows are stronger on mobile than web, which is good, but the overall product truth is still inconsistent across platforms.
- Existing request rows created before the recent upload fix may still point at zero-byte request images, which is a trust risk for support/debugging even though the underlying upload bug is now fixed.

### What would hurt trust if shipped now

- Seeing fake providers or fake provider presentation in the live app.
- Profile/account surfaces that do not reflect the actual signed-in user consistently across clients.
- Request or match flows that look “sent” but depend on undeployed localhost-like services.
- Missing or blank request images for previously saved requests without a clear fallback/error state.

### What must be real on mobile before release

- Public provider/catalog data and provider profiles
- Saved/favorites truth
- Match submission and result retrieval
- Request persistence and request history/detail
- User identity/profile data
- Provider media loading and attachment handling

### What can still be imperfect without damaging trust

- Support being email-based instead of a ticketing system
- Some UX polish around personalization and preference editors
- Draft/session continuity helpers
- Non-critical analytics or recommendation enhancements

## 10. General Product And Architecture Improvements

### A. General architecture improvements

| Improvement | Why it matters | Area affected | Priority | Timing |
|---|---|---|---|---|
| Replace raw-table read coupling with a stable public provider/catalog contract | Reduces reconnect risk and future schema churn | Explore, provider pages, Saved, match results | Critical | Pre-merge |
| Remove mixed live/local/seed production logic | Simplifies mental model and eliminates false-live behavior | Mobile Explore, provider profile, Saved, web profile | Critical | Pre-merge |
| Consolidate shared user-side service contracts | Keeps mobile/web behavior aligned | Requests, matching, onboarding, saved | High | During merge |
| Standardize account/profile truth across clients | Prevents contradictory user identity surfaces | Profile, request prefill, settings | High | Pre-merge |
| Remove legacy demo ID normalization from runtime paths | Eliminates migration baggage from production behavior | Saves, routes, request targeting | High | During merge |

### B. General mobile quality improvements

| Improvement | Why it matters | Area affected | Priority | Timing |
|---|---|---|---|---|
| Replace mock provider avatar/profile presentation with real provider data | Improves trust and storefront quality | Mobile provider profile | High | Pre-App Store |
| Make request image failure states explicit instead of blank tiles | Prevents confusing silent failures | Request detail, support/debugging | High | Pre-App Store |
| Add clearer offline / service-unavailable states for match and notify | Mobile users are less forgiving of silent infra failures | Match, requests | High | Pre-App Store |
| Align category availability and flows across mobile/web | Prevents product inconsistency | Match intake, onboarding, explore | Medium | During merge |
| Reduce prototype-feeling fallbacks in mobile Explore/Saved/Profile | App Store trust issue | Core mobile browsing flows | High | Pre-App Store |

### C. General backend / data model improvements

| Improvement | Why it matters | Area affected | Priority | Timing |
|---|---|---|---|---|
| Create a public provider/catalog read model | Gives the user app a safe shared contract | Catalog, profiles, match results | Critical | Pre-merge |
| Normalize request lifecycle/statuses fully | Removes client-side legacy compatibility branching | Requests, request history, provider handling | High | During merge |
| Normalize saved-state contract and remove local-only semantics from business logic | Improves multi-device correctness | Saved, personalization | High | During merge |
| Clarify provider visibility / publish / completeness fields | Prevents half-ready providers from appearing | Explore, storefront | High | During merge |
| Standardize media/image handling across public and private assets | Reduces broken-image and storage mismatch risk | Explore, requests, avatars, matching | High | Pre-App Store |
| Strengthen trust-signal structure | Supports better provider ranking and confidence | Catalog, storefront, matching | Medium | Post-merge |

### D. General product model improvements

| Improvement | Why it matters | Area affected | Priority | Timing |
|---|---|---|---|---|
| Improve provider profile completeness | A stronger storefront is necessary if pros become source of truth | Provider profile, requests | High | During merge |
| Make saved state more useful than raw IDs | Better saved experience improves retention and quality | Saved | Medium | Post-merge |
| Clarify request status communication | Users need to know saved vs notified vs responded | Requests, profile | High | Pre-App Store |
| Improve match trust signals and explanation | Users need confidence that results are meaningful | Match results | Medium | Post-merge |
| Standardize empty/loading/error states | Reduces prototype feel and support burden | Mobile and web broadly | High | Pre-App Store |

### E. Improvements that are not urgent for merge, but important soon

#### Near-term improvements
- Add web request history/detail parity.
- Add explicit match-engine / notify health diagnostics surfaced in-app or admin-facing.
- Clean up saved-service error handling bug in `src/lib/saved/service.ts`.

#### Medium-term improvements
- Replace client polling with a more robust real-time or event-driven match-completion path.
- Introduce a dedicated support backend instead of email-only support.
- Remove compatibility shims once the hosted schema fully matches the current contract.

#### Longer-term improvements
- Evolve matching into a server-owned public recommendation service rather than client-composed row grouping.
- Add richer provider trust models (reviews, verification, portfolio completeness scoring).
- Build clearer provider-side request lifecycle feedback back into the user app.

## 11. Final Recommendation

**Is this app ready to reconnect to the pro backend?**

Not cleanly yet. It is close enough to continue reconnect planning and contract work, but it is **not ready for a low-risk reconnect or App Store-quality release without targeted cleanup first**.

**Top 3 blockers**

1. Mixed live/seed/demo behavior still exists on core production-facing surfaces, especially on mobile and web profile.
2. The app still depends on raw backend implementation tables and compatibility shims instead of a stable shared public provider/catalog contract.
3. User/account/request behavior is still inconsistent across web and mobile, especially around visible account truth, request defaults, and auth/session assumptions.

**What should you work on next?**

1. Lock the public provider/catalog contract that the user app will consume from the pro backend.
2. Remove production-path seed/demo dependencies and replace web profile/request defaults with real backend-backed identity.
3. Run a reconnect hardening pass focused on mobile: provider storefront truth, request/media reliability, match/notify deployment assumptions, and clear error states.
