# Supabase — Trustfall

## Seed data (`seed.sql`)

`seed.sql` loads realistic data for local Explore and Get Matched testing:

| Area | Contents |
|------|----------|
| **Catalog** | Four curated professionals (`a111…`), eight portfolio items (`b111…`), style tags |
| **Clients** | Three demo users (`c111…`) with profiles and `user_preferences` |
| **Pros** | Two professional accounts (`e111…`) with `account_type = professional`, owned businesses (`f111…`), four portfolio items (`f211…`) and tags |
| **Matching** | Two submitted `match_requests` (`d111…`), one precomputed `match_results` + three `match_result_rows` for Maya’s hair brief |

- **Demo password (all seeded email users):** `TrustfallDemo#1` — change in hosted environments.

### Sample accounts (email / password)

| Role | Email |
|------|--------|
| Client | `maya.johnson@example.com`, `chris.davis@example.com`, `alina.patel@example.com` |
| Pro | `jordan.lee.pro@example.com`, `sloane.meyer.pro@example.com` |

### Run with Supabase CLI (local)

Requires [Docker Desktop](https://docs.docker.com/desktop/) and a `config.toml` that enables the seed file (default from `supabase init` includes `[db.seed]` with `./seed.sql`).

```bash
supabase db reset
```

This applies migrations, then runs `seed.sql`. Use `supabase db reset --no-seed` to skip the seed.

### Run with `psql` (any Postgres)

Apply migrations first, then:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

On Windows PowerShell (local default port 54322):

```powershell
$env:PGPASSWORD = "postgres"
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Use a **superuser** or role that can insert into `auth.users` and `auth.identities` (local `postgres` user does).

### If auth inserts fail

Supabase upgrades sometimes change `auth.users` / `auth.identities` columns. You can:

1. Run migrations, then insert only the **public** catalog by copying the first sections of `seed.sql` (professionals, `portfolio_items`, `portfolio_item_tags`), or  
2. Adjust the `auth.users` / `auth.identities` blocks to match your `information_schema` columns.

Seeding the database with SQL does **not** require the service role key. The service role is required for the **verification script** and the **match engine** (`npm run match-engine`), which bypass RLS.

---

## Verification (`npm run db:verify`)

After `supabase db reset` (or migrations + seed), run:

```bash
npm run db:verify
```

Set in `.env.local` (or the environment):

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin user lifecycle + `runMatchForRequest`)

The script checks client/pro sign-in, profiles, owned professionals, portfolio CRUD as a pro, anonymous Explore counts, creating a `match_request`, running the rules-based matcher via the service client, reading `match_results` / `match_result_rows`, seeded match data, and several RLS expectations (no cross-user `match_requests`, no spoofed profiles, anon cannot read `match_results`).
