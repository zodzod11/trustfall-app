import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_ONBOARDING_V1 } from '@/constants/storage-keys'
import { TrustfallColors } from '@/constants/trustfall-theme'
import { onboardingApi } from '@/lib/onboarding'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getDestinationFromOnboardingResult } from '../../src/lib/onboarding/bootstrapDestination'
import { ONBOARDING_ROUTE_HINT_KEY, type OnboardingRouteHint } from '../../src/lib/onboarding/routeCache'

type BootState = 'loading' | 'welcome' | 'explore' | 'onboarding'

/** Legacy key — cleared once; routing does not read it. */
async function clearLegacyOnboardingFlag(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_ONBOARDING_V1)
  } catch {
    /* ignore */
  }
}

async function writeMobileRouteHint(isComplete: boolean): Promise<void> {
  try {
    const payload: OnboardingRouteHint = { isComplete, cachedAt: Date.now() }
    await AsyncStorage.setItem(ONBOARDING_ROUTE_HINT_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export default function Index() {
  const [boot, setBoot] = useState<BootState>('loading')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await clearLegacyOnboardingFlag()
      if (!isSupabaseConfigured) {
        if (!cancelled) setBoot('welcome')
        return
      }
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (sessionErr || !session?.user) {
        setBoot('welcome')
        return
      }
      const res = await onboardingApi.getOnboardingState()
      if (cancelled) return
      if (!res.error) {
        await writeMobileRouteHint(res.data.isComplete)
      }
      const dest = getDestinationFromOnboardingResult(res)
      setBoot(dest === 'explore' ? 'explore' : 'onboarding')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (boot === 'loading') {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={TrustfallColors.primary} />
      </View>
    )
  }

  if (boot === 'welcome') {
    return <Redirect href="/welcome" />
  }
  if (boot === 'explore') {
    return <Redirect href="/(tabs)/explore" />
  }
  return <Redirect href="/onboarding" />
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: TrustfallColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
