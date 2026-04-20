// Accept UUID-shaped deterministic seed IDs even if they don't use RFC version/variant bits.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function allowLegacyDemoResolution(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export const LEGACY_DEMO_PROFESSIONAL_IDS: Record<string, string> = {
  pro_001: 'a1111111-1111-1111-1111-111111111101',
  pro_002: 'a1111111-1111-1111-1111-111111111102',
  pro_003: 'a1111111-1111-1111-1111-111111111103',
  pro_004: 'a1111111-1111-1111-1111-111111111104',
}

export const LEGACY_DEMO_PORTFOLIO_IDS: Record<string, string> = {
  p_barber_1: 'b1111111-1111-1111-1111-111111111101',
  p_barber_2: 'b1111111-1111-1111-1111-111111111102',
  p_hair_1: 'b1111111-1111-1111-1111-111111111103',
  p_hair_2: 'b1111111-1111-1111-1111-111111111104',
  p_nails_1: 'b1111111-1111-1111-1111-111111111105',
  p_nails_2: 'b1111111-1111-1111-1111-111111111106',
  p_tattoo_1: 'b1111111-1111-1111-1111-111111111107',
  p_tattoo_2: 'b1111111-1111-1111-1111-111111111108',
}

export function isCatalogUuid(id: string): boolean {
  return UUID_RE.test(id.trim())
}

export function resolveProfessionalId(id: string): string {
  const trimmed = id.trim()
  if (!trimmed) return trimmed
  if (isCatalogUuid(trimmed)) return trimmed
  if (!allowLegacyDemoResolution()) return trimmed
  return LEGACY_DEMO_PROFESSIONAL_IDS[trimmed] ?? trimmed
}

export function resolvePortfolioItemId(id: string): string {
  const trimmed = id.trim()
  if (!trimmed) return trimmed
  if (isCatalogUuid(trimmed)) return trimmed
  if (!allowLegacyDemoResolution()) return trimmed
  return LEGACY_DEMO_PORTFOLIO_IDS[trimmed] ?? trimmed
}

export function canResolveForContactRequest(
  professionalId: string,
  portfolioItemId: string,
): boolean {
  return isCatalogUuid(resolveProfessionalId(professionalId)) &&
    isCatalogUuid(resolvePortfolioItemId(portfolioItemId))
}

export function normalizeSavedProfessionalId(id: string): string {
  return resolveProfessionalId(id)
}

export function normalizeSavedPortfolioItemId(id: string): string {
  return resolvePortfolioItemId(id)
}
