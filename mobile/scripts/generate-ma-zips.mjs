#!/usr/bin/env node
/**
 * Downloads US ZIP data (millbj92/US-Zip-Codes-JSON), filters Massachusetts,
 * and writes `data/ma-zips.generated.json` for the Match location catalog.
 *
 * Run from repo root: node mobile/scripts/generate-ma-zips.mjs
 * Or: cd mobile && node scripts/generate-ma-zips.mjs
 *
 * Source: https://github.com/millbj92/US-Zip-Codes-JSON (MIT-style community dataset)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'data', 'ma-zips.generated.json')
const URL =
  'https://raw.githubusercontent.com/millbj92/US-Zip-Codes-JSON/master/USCities.json'

function zip5(n) {
  return String(n).padStart(5, '0')
}

async function main() {
  const res = await fetch(URL)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const rows = await res.json()
  const ma = rows.filter((r) => r.state === 'MA')
  const entries = ma.map((r) => {
    const zip = zip5(r.zip_code)
    const city = String(r.city || '').trim() || 'Massachusetts'
    return {
      id: `ma_${zip}`,
      city,
      state: 'MA',
      zip,
      latitude: r.latitude,
      longitude: r.longitude,
    }
  })
  entries.sort((a, b) => a.zip.localeCompare(b.zip))
  fs.writeFileSync(OUT, JSON.stringify(entries, null, 0), 'utf8')
  console.log(`Wrote ${entries.length} MA locations → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
