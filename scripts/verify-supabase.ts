/**
 * Trustfall — local Supabase verification (RLS, Explore, match engine).
 *
 * Prerequisites:
 *   • `supabase db reset` (or migrations + `psql -f supabase/seed.sql`)
 *   • `.env.local` with SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_ANON_KEY,
 *     SUPABASE_SERVICE_ROLE_KEY (publishable + service role from local Supabase)
 *
 * Run: npx tsx scripts/verify-supabase.ts
 *   or: npm run db:verify
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { runMatchForRequest } from '../src/lib/matching/runMatchForRequest.ts'

dotenv.config()
dotenv.config({ path: '.env.local' })

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEMO_PASSWORD = 'TrustfallDemo#1'

const MAYA_EMAIL = 'maya.johnson@example.com'
const JORDAN_EMAIL = 'jordan.lee.pro@example.com'

const CHRIS_ID = 'c1111111-1111-1111-1111-111111111102'
const JORDAN_PRO_ID = 'f1111111-1111-1111-1111-111111111101'
const SEEDED_MATCH_RESULT_ID = 'd2111111-1111-1111-1111-111111111101'

type Check = { name: string; ok: boolean; detail?: string }

function fail(msg: string): never {
  throw new Error(msg)
}

async function main() {
  const checks: Check[] = []

  if (!url || !anonKey) {
    fail('Missing SUPABASE_URL / VITE_SUPABASE_URL or SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY')
  }
  if (!serviceKey) {
    fail('Missing SUPABASE_SERVICE_ROLE_KEY (required for admin + match engine verification)')
  }

  const anon = createClient(url, anonKey)
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // --- 1) Client session + profile (simulates post-signup state from seed) ---
  const maya = createClient(url, anonKey)
  {
    const { data, error } = await maya.auth.signInWithPassword({
      email: MAYA_EMAIL,
      password: DEMO_PASSWORD,
    })
    if (error || !data.user) {
      checks.push({
        name: 'Client sign-in (Maya)',
        ok: false,
        detail: error?.message ?? 'no user',
      })
    } else {
      const { data: prof, error: perr } = await maya
        .from('profiles')
        .select('id, display_name, account_type, city')
        .eq('id', data.user.id)
        .maybeSingle()
      checks.push({
        name: 'Profile readable after client sign-in',
        ok: !perr && !!prof && prof.account_type === 'client',
        detail: perr?.message ?? (!prof ? 'no row' : JSON.stringify(prof)),
      })
    }
  }

  // --- 2) Pro session + owned professional + portfolio insert ---
  const jordan = createClient(url, anonKey)
  {
    const { data, error } = await jordan.auth.signInWithPassword({
      email: JORDAN_EMAIL,
      password: DEMO_PASSWORD,
    })
    if (error || !data.user) {
      checks.push({
        name: 'Pro sign-in (Jordan)',
        ok: false,
        detail: error?.message ?? 'no user',
      })
    } else {
      const { data: prof, error: perr } = await jordan
        .from('profiles')
        .select('account_type')
        .eq('id', data.user.id)
        .maybeSingle()
      checks.push({
        name: 'Pro profile has account_type professional',
        ok: !perr && prof?.account_type === 'professional',
        detail: perr?.message,
      })

      const { data: owned, error: oerr } = await jordan
        .from('professionals')
        .select('id, slug, owner_user_id')
        .eq('owner_user_id', data.user.id)
      checks.push({
        name: 'Pro can read owned professional row(s)',
        ok: !oerr && (owned?.length ?? 0) >= 1,
        detail: oerr?.message,
      })

      const scratchTitle = `Verification scratch ${Date.now()}`
      const { data: inserted, error: ierr } = await jordan
        .from('portfolio_items')
        .insert({
          professional_id: JORDAN_PRO_ID,
          service_title: scratchTitle,
          category: 'hair',
          price: 55,
          before_image_path: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=70',
          after_image_path: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=70',
          sort_order: 99,
          published: false,
        })
        .select('id')
        .maybeSingle()

      if (!ierr && inserted?.id) {
        await jordan.from('portfolio_items').delete().eq('id', inserted.id)
      }
      checks.push({
        name: 'Pro can insert + delete portfolio item on owned business',
        ok: !ierr && !!inserted?.id,
        detail: ierr?.message,
      })
    }
  }

  // --- 3) Explore-style read (anon): published portfolio items ---
  {
    const { error, count } = await anon
      .from('portfolio_items')
      .select('id', { count: 'exact', head: true })
      .eq('published', true)
    checks.push({
      name: 'Explore query: anon can count published portfolio_items',
      ok: !error && (count ?? 0) >= 8,
      detail: error?.message ?? `count=${count ?? 0} (seed expects 8+ catalog items)`,
    })
  }

  // --- 4) Match request create (Maya) ---
  await maya.auth.signOut()
  await maya.auth.signInWithPassword({ email: MAYA_EMAIL, password: DEMO_PASSWORD })
  const {
    data: { user: mayaUser },
  } = await maya.auth.getUser()
  if (!mayaUser) fail('Maya session missing')

  let newMatchRequestId: string | null = null
  {
    const { data: ins, error } = await maya
      .from('match_requests')
      .insert({
        user_id: mayaUser.id,
        status: 'submitted',
        category: 'hair',
        location_text: 'Houston, TX',
        tags: ['balayage', 'face-framing'],
        desired_style_text: 'Soft dimension and healthy shine; low-maintenance grow-out.',
        current_state_text: 'Natural level 6 with old highlights on ends.',
        budget_min: 120,
        budget_max: 260,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    newMatchRequestId = ins?.id ?? null
    checks.push({
      name: 'Authenticated user can create submitted match_request',
      ok: !error && !!newMatchRequestId,
      detail: error?.message,
    })
  }

  // --- 5) Matching engine (service role) ---
  if (newMatchRequestId) {
    const result = await runMatchForRequest(service, newMatchRequestId)
    checks.push({
      name: 'Matching engine produces ready match_results + rows',
      ok: result.ok && result.rows_written > 0,
      detail: result.ok
        ? `rows=${result.rows_written}`
        : (result as { error: string }).error,
    })

    const { data: mr } = await maya
      .from('match_results')
      .select('id, status')
      .eq('match_request_id', newMatchRequestId)
      .maybeSingle()
    checks.push({
      name: 'Client can read own match_results after engine run',
      ok: !!mr && mr.status === 'ready',
      detail: mr ? JSON.stringify(mr) : 'no row',
    })

    const mrId = mr?.id
    if (mrId) {
      const { count: rowCount, error: rowErr } = await maya
        .from('match_result_rows')
        .select('id', { count: 'exact', head: true })
        .eq('match_result_id', mrId)
      checks.push({
        name: 'Client can read match_result_rows for own job',
        ok: !rowErr && (rowCount ?? 0) > 0,
        detail: rowErr?.message ?? `count=${rowCount}`,
      })
    }
  }

  // --- 6) Seeded match result visible to owner ---
  {
    const { data, error } = await maya
      .from('match_results')
      .select('id, status, payload')
      .eq('id', SEEDED_MATCH_RESULT_ID)
      .maybeSingle()
    checks.push({
      name: 'Seeded match_results row readable by owning user',
      ok: !error && data?.status === 'ready' && !!(data.payload as { top?: unknown })?.top,
      detail: error?.message,
    })

    const { count, error: e2 } = await maya
      .from('match_result_rows')
      .select('id', { count: 'exact', head: true })
      .eq('match_result_id', SEEDED_MATCH_RESULT_ID)
    checks.push({
      name: 'Seeded match_result_rows present',
      ok: !e2 && (count ?? 0) === 3,
      detail: e2?.message ?? `count=${count}`,
    })
  }

  // --- 7) RLS: cannot read another user’s match_requests by id ---
  {
    const { data, error } = await maya
      .from('match_requests')
      .select('id')
      .eq('id', 'd1111111-1111-1111-1111-111111111102')
      .maybeSingle()
    checks.push({
      name: 'RLS hides other users match_requests (Chris request invisible to Maya)',
      ok: !error && data === null,
      detail: data ? `unexpected row ${data.id}` : undefined,
    })
  }

  // --- 8) RLS: cannot insert profile for another user ---
  {
    const { error } = await maya.from('profiles').insert({
      id: CHRIS_ID,
      display_name: 'Should Fail',
      account_type: 'client',
    } as never)
    checks.push({
      name: 'RLS blocks inserting profile for another user id',
      ok: !!error,
      detail: error?.message,
    })
  }

  // --- 9) Anon cannot read private match results ---
  {
    const { data, error } = await anon
      .from('match_results')
      .select('id')
      .eq('id', SEEDED_MATCH_RESULT_ID)
      .maybeSingle()
    checks.push({
      name: 'Anon session cannot read match_results',
      ok: !error && data === null,
      detail: data ? 'got row' : undefined,
    })
  }

  // --- 10) Admin: signup creates profile (create + delete ephemeral user) ---
  {
    const email = `verify_${Date.now()}@example.com`
    const { data: created, error: cErr } = await service.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Verify Seed User' },
    })
    if (cErr || !created.user) {
      checks.push({
        name: 'Service role can create auth user (signup simulation)',
        ok: false,
        detail: cErr?.message,
      })
    } else {
      const { data: p, error: pErr } = await service
        .from('profiles')
        .select('id, display_name')
        .eq('id', created.user.id)
        .maybeSingle()
      const { error: dErr } = await service.auth.admin.deleteUser(created.user.id)
      checks.push({
        name: 'New auth user gets profiles row; admin can delete user',
        ok: !pErr && !!p && !dErr,
        detail: [pErr?.message, dErr?.message].filter(Boolean).join(' | ') || undefined,
      })
    }
  }

  // --- Summary ---
  const failed = checks.filter((c) => !c.ok)
  console.log('\nTrustfall Supabase verification\n')
  for (const c of checks) {
    const icon = c.ok ? '✓' : '✗'
    console.log(`${icon} ${c.name}`)
    if (c.detail) console.log(`    ${c.detail}`)
  }
  console.log('')
  if (failed.length) {
    console.error(`Failed: ${failed.length} / ${checks.length}\n`)
    process.exitCode = 1
  } else {
    console.log(`All checks passed (${checks.length}).\n`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
