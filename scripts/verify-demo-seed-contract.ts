import { readFile } from 'node:fs/promises'

type SeedCheck = {
  label: string
  ok: boolean
  detail?: string
}

const root = new URL('../', import.meta.url)
const srcSeedPath = new URL('../src/data/seed.ts', import.meta.url)
const mobileSeedPath = new URL('../mobile/data/seed.ts', import.meta.url)
const sqlSeedPath = new URL('../supabase/seed.sql', import.meta.url)

const demoUsers = [
  'c1111111-1111-1111-1111-111111111101',
  'c1111111-1111-1111-1111-111111111102',
  'c1111111-1111-1111-1111-111111111103',
]

const demoProfessionals = [
  {
    id: 'a1111111-1111-1111-1111-111111111101',
    phone: '+16177550418',
  },
  {
    id: 'a1111111-1111-1111-1111-111111111102',
    phone: '+17135550182',
  },
  {
    id: 'a1111111-1111-1111-1111-111111111103',
    phone: '+12145550147',
  },
  {
    id: 'a1111111-1111-1111-1111-111111111104',
    phone: '+17135550194',
  },
]

const demoPortfolioItems = [
  'b1111111-1111-1111-1111-111111111101',
  'b1111111-1111-1111-1111-111111111102',
  'b1111111-1111-1111-1111-111111111103',
  'b1111111-1111-1111-1111-111111111104',
  'b1111111-1111-1111-1111-111111111105',
  'b1111111-1111-1111-1111-111111111106',
  'b1111111-1111-1111-1111-111111111107',
  'b1111111-1111-1111-1111-111111111108',
]

const forbiddenLegacyTokens = [
  'pro_001',
  'pro_002',
  'pro_003',
  'pro_004',
  'p_barber_1',
  'p_barber_2',
  'p_hair_1',
  'p_hair_2',
  'p_nails_1',
  'p_nails_2',
  'p_tattoo_1',
  'p_tattoo_2',
  'u_001',
  'u_002',
  'u_003',
  'requestsSeed',
  'savedItemsSeed',
  'matchResultsSeed',
]

function hasLiteral(content: string, literal: string) {
  return content.includes(`'${literal}'`) || content.includes(`"${literal}"`)
}

function pushCheck(
  checks: SeedCheck[],
  label: string,
  ok: boolean,
  detail?: string,
) {
  checks.push({ label, ok, detail })
}

async function main() {
  const [srcSeed, mobileSeed, sqlSeed] = await Promise.all([
    readFile(srcSeedPath, 'utf8'),
    readFile(mobileSeedPath, 'utf8'),
    readFile(sqlSeedPath, 'utf8'),
  ])

  const checks: SeedCheck[] = []

  for (const id of demoUsers) {
    pushCheck(checks, `src seed contains demo user ${id}`, hasLiteral(srcSeed, id))
    pushCheck(checks, `mobile seed contains demo user ${id}`, hasLiteral(mobileSeed, id))
    pushCheck(checks, `sql seed contains demo user ${id}`, hasLiteral(sqlSeed, id))
  }

  for (const professional of demoProfessionals) {
    pushCheck(
      checks,
      `src seed contains professional ${professional.id}`,
      hasLiteral(srcSeed, professional.id),
    )
    pushCheck(
      checks,
      `mobile seed contains professional ${professional.id}`,
      hasLiteral(mobileSeed, professional.id),
    )
    pushCheck(
      checks,
      `sql seed contains professional ${professional.id}`,
      hasLiteral(sqlSeed, professional.id),
    )
    pushCheck(
      checks,
      `src seed contains phone ${professional.phone}`,
      hasLiteral(srcSeed, professional.phone),
    )
    pushCheck(
      checks,
      `mobile seed contains phone ${professional.phone}`,
      hasLiteral(mobileSeed, professional.phone),
    )
    pushCheck(
      checks,
      `sql seed contains phone ${professional.phone}`,
      hasLiteral(sqlSeed, professional.phone),
    )
  }

  for (const id of demoPortfolioItems) {
    pushCheck(checks, `src seed contains portfolio item ${id}`, hasLiteral(srcSeed, id))
    pushCheck(checks, `mobile seed contains portfolio item ${id}`, hasLiteral(mobileSeed, id))
    pushCheck(checks, `sql seed contains portfolio item ${id}`, hasLiteral(sqlSeed, id))
  }

  for (const token of forbiddenLegacyTokens) {
    pushCheck(
      checks,
      `src seed removed legacy token ${token}`,
      !srcSeed.includes(token),
      srcSeed.includes(token) ? `Found ${token} in ${new URL(srcSeedPath).pathname}` : undefined,
    )
    pushCheck(
      checks,
      `mobile seed removed legacy token ${token}`,
      !mobileSeed.includes(token),
      mobileSeed.includes(token) ? `Found ${token} in ${new URL(mobileSeedPath).pathname}` : undefined,
    )
  }

  const failures = checks.filter((check) => !check.ok)

  console.log('\nTrustfall demo seed contract verification\n')
  for (const check of checks) {
    console.log(`${check.ok ? '✓' : '✗'} ${check.label}`)
    if (check.detail) console.log(`    ${check.detail}`)
  }
  console.log('')

  if (failures.length > 0) {
    console.error(`Failed: ${failures.length} / ${checks.length}`)
    process.exitCode = 1
    return
  }

  console.log(`All checks passed (${checks.length}).`)
  console.log(`Verified against ${root.pathname}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
