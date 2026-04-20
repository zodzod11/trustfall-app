import * as Location from 'expo-location'
import { Platform } from 'react-native'
import type { MatchLocationPick } from '@/types'

/**
 * Requests foreground permission, reads GPS, reverse-geocodes to city/state/zip when available.
 */
export async function getMatchLocationFromDevice(): Promise<
  { ok: true; location: MatchLocationPick } | { ok: false; reason: 'denied' | 'unavailable' }
> {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'unavailable' }
  }
  if (typeof Location.requestForegroundPermissionsAsync !== 'function') {
    return { ok: false, reason: 'unavailable' }
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      return { ok: false, reason: 'denied' }
    }

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    const { latitude, longitude } = pos.coords

    let city = 'Nearby'
    let state = ''
    let zip: string | undefined

    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude })
      const first = places[0]
      if (first) {
        city = first.city || first.subregion || first.district || city
        state = first.region || ''
        zip = first.postalCode || undefined
      }
    } catch {
      /* keep coords + fallback label */
    }

    const location: MatchLocationPick = {
      source: 'current_location',
      city,
      state,
      zip,
      latitude,
      longitude,
    }

    return { ok: true, location }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
