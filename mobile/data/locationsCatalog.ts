/**
 * Normalized service-area rows for manual match location search.
 * Massachusetts: all ZIPs with lat/lng from `ma-zips.generated.json` (regenerate via
 * `node scripts/generate-ma-zips.mjs`). Other markets: hand-curated below.
 * Replace or augment with Supabase / Places when you wire production data.
 */
import maZipsGenerated from './ma-zips.generated.json'

export type LocationCatalogEntry = {
  id: string
  city: string
  state: string
  zip: string
  latitude: number
  longitude: number
}

const MA_LOCATIONS = maZipsGenerated as LocationCatalogEntry[]

const LOCATIONS_CATALOG_OTHER: LocationCatalogEntry[] = [
  { id: 'tx_aus_78701', city: 'Austin', state: 'TX', zip: '78701', latitude: 30.2672, longitude: -97.7431 },
  { id: 'tx_aus_78704', city: 'Austin', state: 'TX', zip: '78704', latitude: 30.2458, longitude: -97.7658 },
  { id: 'tx_hou_77002', city: 'Houston', state: 'TX', zip: '77002', latitude: 29.7604, longitude: -95.3698 },
  { id: 'tx_hou_77019', city: 'Houston', state: 'TX', zip: '77019', latitude: 29.7531, longitude: -95.4171 },
  { id: 'tx_dal_75201', city: 'Dallas', state: 'TX', zip: '75201', latitude: 32.7767, longitude: -96.797 },
  { id: 'tx_dal_75204', city: 'Dallas', state: 'TX', zip: '75204', latitude: 32.8015, longitude: -96.7877 },
  { id: 'ny_nyc_10001', city: 'New York', state: 'NY', zip: '10001', latitude: 40.7505, longitude: -73.9934 },
  { id: 'ca_la_90012', city: 'Los Angeles', state: 'CA', zip: '90012', latitude: 34.0522, longitude: -118.2437 },
  { id: 'fl_mia_33131', city: 'Miami', state: 'FL', zip: '33131', latitude: 25.7617, longitude: -80.1918 },
]

/** Full catalog: entire state of MA (all ZIP rows from generated file) + other seed markets. */
export const LOCATIONS_CATALOG: LocationCatalogEntry[] = [...MA_LOCATIONS, ...LOCATIONS_CATALOG_OTHER]

export function searchLocationsCatalog(query: string, limit = 12): LocationCatalogEntry[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  if (q.length < 2) return []
  return LOCATIONS_CATALOG.filter((row) => {
    const hay = `${row.city} ${row.state} ${row.zip}`.toLowerCase()
    return hay.includes(q) || row.zip.startsWith(q)
  }).slice(0, limit)
}
