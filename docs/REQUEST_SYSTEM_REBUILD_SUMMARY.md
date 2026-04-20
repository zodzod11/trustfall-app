# Request System Rebuild Summary

## 1. Old app reference

The old user app had two persisted request-like systems:

- `bookings` for direct appointment intent
- `match_requests` for match intake, processing, and provider notification

What it got right:

- persisted request rows existed in the backend
- match requests were saved before downstream processing
- provider notifications were tied to persisted request rows
- request history existed for match requests

What should not be carried forward:

- fake booking confirmation / availability logic
- split booking-vs-match request architecture at the user outreach stage
- inconsistent image storage between request surfaces
- direct UI coupling to raw tables and special-case local state

## 2. What the current app was doing before this rebuild

Before this change, the current app had a mixed request system:

- web request modals were still effectively notify-first and session-local
- mobile request modals wrote `contact_requests`, but used mobile-only persistence/upload logic
- mobile request history and detail screens still read local `requestSubmissions`
- profile request counts were device-local in both apps
- image upload handling differed across match, request, and notify paths
- request lifecycle/status handling was inconsistent and too booking-oriented

## 3. What changed

### Shared request model

`contact_requests` is now the unified persisted user-to-provider request / lead row for:

- direct outreach from explore / profile detail
- match-driven outreach from match results

`match_requests` remains the match intake record, but it is no longer the main sent-request history entity.

### Schema changes

Added migration:

- `supabase/migrations/20260416143000_request_system_rebuild.sql`

This migration:

- makes `professional_id` and `portfolio_item_id` nullable during the transition
- adds request snapshots so history/detail still render without strict live joins
- adds `match_request_id` linkage for match-driven outreach
- replaces the old contact-request status vocabulary with request/lead statuses:
  - `submitted`
  - `notified`
  - `viewed`
  - `responded`
  - `closed`
  - `cancelled`
- adds notification tracking fields:
  - `provider_notified_at`
  - `notified_channels`
  - `notification_error`

### Shared service layer

Added shared request services under `src/lib/requests/`:

- `service.ts`
  - `createRequest`
  - `uploadRequestImages`
  - `getRequestHistory`
  - `getRequestById`
  - `updateRequestNotificationState`
  - `submitRequest`
- `notify.ts`
  - shared provider notification call used by both web and mobile
- `types.ts`
  - shared request/lead contract

### Web request flow

`src/components/explore/RequestModal.tsx` now:

1. uploads request images first
2. creates a real `contact_requests` row
3. only then triggers provider notification
4. stores notification state back onto the request row

The visible request modal flow stays the same.

### Mobile request flow

`mobile/components/booking/RequestBookingModal.tsx` now follows the same shared path:

1. uploads images through the shared request service
2. creates the same request row type as web
3. notifies the provider after persistence
4. records notification status/warnings on the saved request row

The modal UX and navigation flow stay intact.

### Backend-driven history + detail

Added backend-driven request loaders in:

- `src/hooks/useRequestHistory.ts`

Updated mobile screens to use backend request rows instead of local request history:

- `mobile/app/(tabs)/profile.tsx`
- `mobile/app/profile-requests.tsx`
- `mobile/app/profile-request/[id].tsx`

Updated web profile request counts / recent requests to read backend history:

- `src/pages/ProfilePage.tsx`

### Request snapshots

Requests now persist stable display fields such as:

- `provider_name_snapshot`
- `portfolio_title_snapshot`
- `category_snapshot`
- `portfolio_image_url_snapshot`

This lets request history/detail survive catalog gaps and non-UUID transitional data.

## 4. Architecture now in place

### Source of truth

- backend `contact_requests` is the source of truth for sent requests
- local `requestSubmissions` is no longer the request-history source for the main profile/history/detail surfaces

### Request model

`contact_requests` now represents appointment-intent / lead outreach, not a confirmed booking.

### Notification rule

- request row is persisted first
- provider notification is attempted second
- request notification outcome is written back to the request row

### Image handling

- request images upload to `client-uploads/{user_id}/contact-requests/{request_id}/...`
- stored DB values are stable storage paths
- detail screens resolve signed URLs for private assets

### Match relationship

- match intake stays in `match_requests`
- outreach sent from a match result can optionally store `match_request_id`
- sent-request history stays unified under `contact_requests`

## 5. Files changed

- `supabase/migrations/20260416143000_request_system_rebuild.sql`
- `src/lib/requests/types.ts`
- `src/lib/requests/service.ts`
- `src/lib/requests/notify.ts`
- `src/hooks/useRequestHistory.ts`
- `src/components/explore/RequestModal.tsx`
- `src/pages/ProfilePage.tsx`
- `src/pages/ExploreDetailPage.tsx`
- `src/pages/MatchResultsPage.tsx`
- `mobile/components/booking/RequestBookingModal.tsx`
- `mobile/app/(tabs)/profile.tsx`
- `mobile/app/profile-requests.tsx`
- `mobile/app/profile-request/[id].tsx`
- `mobile/app/(tabs)/explore/[id].tsx`
- `mobile/app/(tabs)/match/results.tsx`
- `mobile/app/pro/[id].tsx`
- `mobile/lib/notifyContactRequest.ts`
- `mobile/lib/requestHistory.ts`
- `mobile/services/user/contactRequestService.ts`
- `mobile/services/user/index.ts`
- `mobile/services/pro/portfolioService.ts`
- `mobile/domain/user/types.ts`
- `mobile/types/database/enums.ts`
- `mobile/types/database/rows.ts`
- `mobile/types/database/inserts.ts`
- `mobile/types/database/updates.ts`

## 6. What remains

### Backend / schema follow-up

Still needed outside this repo change:

- apply the new migration to Supabase
- regenerate canonical DB types later if the project moves away from hand-maintained types

### Lifecycle follow-up

The structure now supports richer lifecycle states, but provider-side transitions are still not fully implemented:

- `viewed`
- `responded`
- `closed`
- `cancelled`

The app now stores these cleanly, but only `submitted` and `notified` are actively written by the client request flow today.

### Notification follow-up

The request system is now persistence-first, but provider notifications still depend on the existing notify server / SMS-email configuration.

### Legacy local request state

The old `requestSubmissions` cache still exists in saved-state context for legacy compatibility, but request history/detail/count surfaces now read backend rows instead.

## 7. QA checklist

### Web

- send a request from explore detail
- send a request from match results
- confirm a `contact_requests` row is created
- confirm image paths are stored on the row when files are attached
- confirm notification warnings do not block request persistence
- confirm profile request count increments from backend history

### Mobile

- send a request from explore detail
- send a request from pro profile
- send a request from match results
- confirm the same `contact_requests` row shape is created as web
- confirm request detail shows saved images and current status
- confirm request list persists across reinstall/device/session when signed in

### Schema / backend

- apply migration and verify `contact_requests` accepts nullable `professional_id` / `portfolio_item_id`
- verify new status check constraint is active
- verify `notified_channels` defaults to an empty array
- verify `match_request_id` can be stored for match-driven outreach

## 8. Practical outcome

The request system is now:

- backend-first
- shared across web and mobile
- persistence-first before notification
- able to power backend-driven history and request detail
- structured as a request / lead system instead of a fake booking-confirmation system

The biggest remaining dependency is applying the migration and, later, wiring provider-side lifecycle updates for `viewed`, `responded`, `closed`, and `cancelled`.
