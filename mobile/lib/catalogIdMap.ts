/**
 * Maps demo seed IDs (`pro_001`, `p_barber_1`, …) to Supabase UUIDs from `supabase/seed.sql`
 * so local-only flows (e.g. match ranking) can still insert `contact_requests` when the DB is seeded.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isCatalogUuid(id: string): boolean {
  return UUID_RE.test(id.trim())
}

/** Seed professional id → `professionals.id` in Supabase */
const SEED_PRO_TO_UUID: Record<string, string> = {
  pro_001: 'a1111111-1111-1111-1111-111111111101',
  pro_002: 'a1111111-1111-1111-1111-111111111102',
  pro_003: 'a1111111-1111-1111-1111-111111111103',
  pro_004: 'a1111111-1111-1111-1111-111111111104',
}

/** Seed portfolio item id → `portfolio_items.id` in Supabase */
const SEED_PORTFOLIO_TO_UUID: Record<string, string> = {
  p_barber_1: 'b1111111-1111-1111-1111-111111111101',
  p_barber_2: 'b1111111-1111-1111-1111-111111111102',
  p_hair_1: 'b1111111-1111-1111-1111-111111111103',
  p_hair_2: 'b1111111-1111-1111-1111-111111111104',
  p_nails_1: 'b1111111-1111-1111-1111-111111111105',
  p_nails_2: 'b1111111-1111-1111-1111-111111111106',
  p_makeup_1: 'b1111111-1111-1111-1111-111111111107',
  p_makeup_2: 'b1111111-1111-1111-1111-111111111108',
}

export function resolveProfessionalId(id: string): string {
  const t = id.trim()
  if (isCatalogUuid(t)) return t
  return SEED_PRO_TO_UUID[t] ?? t
}

export function resolvePortfolioItemId(id: string): string {
  const t = id.trim()
  if (isCatalogUuid(t)) return t
  return SEED_PORTFOLIO_TO_UUID[t] ?? t
}

export function canResolveForContactRequest(professionalId: string, portfolioItemId: string): boolean {
  const p = resolveProfessionalId(professionalId)
  const i = resolvePortfolioItemId(portfolioItemId)
  return isCatalogUuid(p) && isCatalogUuid(i)
}
