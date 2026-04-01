# Trustfall `database` types

Hand-written TypeScript aligned with `supabase/migrations/*.sql`. Use these until you switch to generated types.

## Regenerate from Supabase

1. Install CLI and link project (or use `--project-id`).
2. Run:

```bash
npx supabase gen types typescript --project-id "<ref>" -o mobile/types/database/supabase.gen.ts
```

3. Add a thin `supabase.gen.ts` re-export or merge `Database` into `index.ts`.
4. Replace `rows.ts`, `inserts.ts`, `updates.ts`, and `json.ts` by re-exporting from `supabase.gen.ts` (or delete them and update imports).

## What to keep manually

- **`domain.ts`** — Join shapes and `MatchRankingPayloadV1` are not emitted by default.
- **`enums.ts`** — Optional; you can delete and use `Database['public']['Enums']` if you add Postgres enums later (currently CHECK constraints are plain `text`).

## Numeric columns

PostgREST returns `numeric` as **string** in JSON. `ProfileRow.budget_*` and `ProfessionalRow.rating` / `PortfolioItemRow.price` are typed as `string | null` accordingly. Parse with `Number()` or `parseFloat` at the UI boundary.
