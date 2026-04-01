/**
 * String unions aligned with Postgres CHECK constraints and enums.
 * Keep in sync with supabase/migrations/*.sql — or regenerate from Supabase after `gen types`.
 */

/** profiles.account_type */
export type AccountType = 'client' | 'professional' | 'admin'

/** match_requests.status */
export type MatchRequestStatus = 'draft' | 'submitted' | 'cancelled'

/** match_results.status */
export type MatchResultStatus = 'pending' | 'ready' | 'failed'

/** contact_requests.status */
export type ContactRequestStatus = 'pending' | 'viewed' | 'declined' | 'accepted' | 'cancelled'
