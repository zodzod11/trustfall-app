# Mobile Match Parity Summary

## 1. What Web Was Doing

The web app already used a live backend match pipeline:

- `src/hooks/useMatchSubmission.ts` called `submitMatchRequestFlow()`.
- `src/lib/match/submitMatchFlow.ts` inserted a real `match_requests` row, uploaded optional files into `client-uploads`, patched the stored image paths back onto the request, and triggered the match engine.
- `src/hooks/useMatchRunResults.ts` polled `match_results` by `match_request_id`.
- `src/lib/match/fetchMatchResults.ts` read `match_results` and `match_result_rows`.
- `src/lib/match/mapMatchRowsToRanked.ts` mapped backend result rows into ranked provider cards for the UI.

Web request payload shape going into `match_requests`:

- `user_id`
- `status: 'submitted'`
- `category`
- `location_text`
- `tags`
- `vision_notes`
- `desired_style_text`
- `current_state_text`
- `budget_min`
- `budget_max`
- `inspiration_image_path`
- `current_photo_path`
- `saved_look_portfolio_item_id`
- `submitted_at`

Uploaded image storage paths follow:

- `{userId}/match-requests/{matchRequestId}/inspiration.{ext}`
- `{userId}/match-requests/{matchRequestId}/current.{ext}`

Results flow:

- submit returns `matchRequestId`
- results screen navigates with that ID
- polling reads `match_results`
- when ready, rows from `match_result_rows` are mapped into ranked providers

## 2. What Mobile Was Doing Before

Mobile previously kept the intake UX but not the live data flow:

- saved the draft locally in `MatchDraftContext`
- navigated to results without a live `matchRequestId`
- used `rankProfessionals()` for local ranking
- used seed / fallback catalog data for production-facing results
- rendered artificial ranked providers instead of `match_results` rows

## 3. What Changed

Mobile now follows the same backend pipeline as web while keeping the same screens and steps:

- added `mobile/hooks/useMatchSubmission.ts`
- added `mobile/hooks/useMatchRunResults.ts`
- added `mobile/lib/match/triggerMatchEngine.ts`
- refactored shared submit logic into `src/lib/match/submitMatchFlowShared.ts`
- refactored shared polling into `src/hooks/useMatchRunResultsClient.ts`
- updated `mobile/app/(tabs)/match/index.tsx` to:
  - keep the local draft for UX
  - submit a real `match_requests` row
  - upload real images
  - trigger the backend match engine
  - navigate to `/match/results` with `matchRequestId`
- updated `mobile/app/(tabs)/match/results.tsx` to:
  - read `matchRequestId` from route params
  - poll real `match_results`
  - read real `match_result_rows`
  - render ranked providers from backend rows
  - pass the real `matchRequestId` into the booking/request modal

## 4. What Seed / Mock Logic Was Removed or Isolated

Removed from the production mobile results path:

- `rankProfessionals()` driven ranking
- local final result generation
- seed-backed provider ranking for results

Isolated behind dev-only fallback in intake:

- `buildPortfolioFeed()` is only used for saved-look intake fallback when `__DEV__` is true and the live catalog is empty

## 5. What Remains for Full Catalog Alignment

- Mobile still depends on the live catalog being available for saved-look intake in production.
- Mobile match execution needs a reachable match-engine endpoint via `EXPO_PUBLIC_MATCH_ENGINE_URL` or Expo config extra `matchEngineUrl` when not running through the web dev proxy.
- There are unrelated pre-existing mobile/shared TypeScript issues elsewhere in the repo that are not part of the new match parity flow.

## 6. QA Checklist

- Sign in on mobile with a real user.
- Start a match request using the existing mobile steps.
- Submit with inspiration and current-look photos.
- Verify a real `match_requests` row is created.
- Verify uploaded files appear in `client-uploads/{userId}/match-requests/{matchRequestId}/...`.
- Verify the match engine runs and creates a `match_results` row.
- Verify `match_result_rows` are written for that request.
- Confirm mobile results render ranked providers from backend data.
- Confirm the same request shows the same ranked providers on web.
- Confirm tapping Request from mobile results sends the real `matchRequestId`.
- Confirm production mobile results do not depend on `rankProfessionals()` or seed ranking.
