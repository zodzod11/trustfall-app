/**
 * Local match runner — uses the service role to execute `runMatchForRequest`.
 * Run: `npm run match-engine` (port 8788). Vite proxies `/api/match-run` here in dev.
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (from .env.local)
 */
import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: '.env.local' })
import cors from 'cors'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { runMatchForRequest } from '../src/lib/matching/runMatchForRequest.ts'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const port = Number(process.env.MATCH_ENGINE_PORT ?? 8788)
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

app.post('/api/match-run', async (req, res) => {
  try {
    if (!url || !anonKey || !serviceKey) {
      res.status(500).json({ ok: false, error: 'Missing Supabase env (URL, anon, service role)' })
      return
    }

    const authHeader = req.headers.authorization
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null
    if (!token) {
      res.status(401).json({ ok: false, error: 'Missing Authorization bearer token' })
      return
    }

    const userClient = createClient(url, anonKey)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr || !userData.user) {
      res.status(401).json({ ok: false, error: userErr?.message ?? 'Invalid session' })
      return
    }

    const matchRequestId = (req.body as { match_request_id?: string })?.match_request_id
    if (!matchRequestId || typeof matchRequestId !== 'string') {
      res.status(400).json({ ok: false, error: 'match_request_id required' })
      return
    }

    const admin = createClient(url, serviceKey)
    const { data: row, error: rowErr } = await admin
      .from('match_requests')
      .select('user_id')
      .eq('id', matchRequestId)
      .maybeSingle()

    if (rowErr || !row) {
      res.status(404).json({ ok: false, error: 'match_request not found' })
      return
    }
    if ((row as { user_id: string }).user_id !== userData.user.id) {
      res.status(403).json({ ok: false, error: 'Forbidden' })
      return
    }

    const result = await runMatchForRequest(admin, matchRequestId)
    if (!result.ok) {
      res.status(500).json({ ok: false, error: result.error })
      return
    }
    res.json({ ok: true, match_result_id: result.match_result_id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(500).json({ ok: false, error: msg })
  }
})

app.listen(port, () => {
  console.log(`[match-engine] listening on http://localhost:${port}`)
})
