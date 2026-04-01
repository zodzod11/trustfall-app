/**
 * Trustfall Supabase database types (hand-maintained).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REGENERATION (Supabase CLI)
 * ─────────────────────────────────────────────────────────────────────────────
 * When the schema stabilizes, generate canonical types and shrink hand-written files:
 *
 *   npx supabase gen types typescript --project-id "<ref>" > mobile/types/database/supabase.gen.ts
 *
 * Files safe to **replace or narrow** after codegen:
 *   • `rows.ts`     → use `Database['public']['Tables'][*]['Row']`
 *   • `inserts.ts`  → use `Database['public']['Tables'][*]['Insert']`
 *   • `updates.ts`  → use `Database['public']['Tables'][*]['Update']`
 *   • `json.ts`     → use `Json` export from generated file if provided
 *
 * Files to **keep** (not generated):
 *   • `enums.ts`    → optional: derive unions via Pick from generated Row, or keep as source of truth for CHECK constraints
 *   • `domain.ts`   → composed app types (joins, payloads)
 *   • `README.md`   → team notes
 *
 * Re-export pattern after codegen:
 *   export type { Database } from './supabase.gen'
 *   export type ProfileRow = Database['public']['Tables']['profiles']['Row']
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type { Json } from './json'

export type {
  AccountType,
  ContactRequestStatus,
  MatchRequestStatus,
  MatchResultStatus,
} from './enums'

export type {
  ContactRequestRow,
  MatchRequestRow,
  MatchResultRankingRow,
  MatchResultRow,
  PortfolioItemRow,
  PortfolioItemTagRow,
  ProfessionalRow,
  ProfileRow,
  SavedPortfolioRow,
  UserPreferencesRow,
} from './rows'

export type {
  ContactRequestInsert,
  MatchRequestInsert,
  MatchResultInsert,
  MatchResultRankingInsert,
  PortfolioItemInsert,
  PortfolioItemTagInsert,
  ProfessionalInsert,
  ProfileInsert,
  SavedPortfolioInsert,
  UserPreferencesInsert,
} from './inserts'

export type {
  ContactRequestUpdate,
  MatchRequestUpdate,
  MatchResultUpdate,
  PortfolioItemUpdate,
  ProfessionalUpdate,
  ProfileUpdate,
  UserPreferencesUpdate,
} from './updates'

export type {
  ContactRequestForClientList,
  ContactRequestForProInbox,
  MatchComponentScoresV1,
  MatchRankingPayloadV1,
  MatchRequestWithResult,
  PortfolioItemWithTags,
  ProfessionalWithPortfolioItems,
  ProfessionalWithTaggedItems,
} from './domain'

export { isMatchResultReady } from './domain'
