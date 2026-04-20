import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_ONBOARDING_V1 } from '@/constants/storage-keys'
import { TrustfallColors } from '@/constants/trustfall-theme'
import { onboardingApi } from '@/lib/onboarding'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getDestinationFromOnboardingResult } from '../../src/lib/onboarding/bootstrapDestination'
import {
  ONBOARDING_ROUTE_HINT_KEY,
  parseRouteHint,
  type OnboardingRouteHint,
} from '../../src/lib/onboarding/routeCache'

type BootState = 'loading' | 'welcome' | 'explore' | 'onboarding' | 'verification-error'

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

async function readMobileRouteHint(): Promise<OnboardingRouteHint | null> {
  try {
    return parseRouteHint(await AsyncStorage.getItem(ONBOARDING_ROUTE_HINT_KEY))
  } catch {
    return null
  }
}

function isTransientVerificationError(message: string | null | undefined): boolean {
  const normalized = (message ?? '').trim().toLowerCase()
  if (!normalized) return false
  return (
    normalized.includes('network request failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('network error') ||
    normalized.includes('request timeout')
  )
}

export default function Index() {
  const [boot, setBoot] = useState<BootState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setBoot('loading')
      setVerificationError(null)
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
      if (dest === 'verification-error') {
        const message = res.error?.message ?? 'We could not verify your account right now.'
        if (isTransientVerificationError(message)) {
          const cachedRouteHint = await readMobileRouteHint()
          if (cancelled) return
          if (cachedRouteHint) {
            setBoot(cachedRouteHint.isComplete ? 'explore' : 'onboarding')
            return
          }
        }
        setVerificationError(message)
        setBoot('verification-error')
        return
      }
      setBoot(dest === 'explore' ? 'explore' : 'onboarding')
    })()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

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
  if (boot === 'verification-error') {
    return (
      <View style={styles.boot}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Couldn&apos;t verify your account</Text>
          <Text style={styles.errorBody}>
            {verificationError ?? 'Check your connection and try again.'}
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => setReloadKey((current) => current + 1)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    )
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
    paddingHorizontal: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TrustfallColors.foreground,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    color: TrustfallColors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    minWidth: 160,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: TrustfallColors.primary,
  },
  retryBtnText: {
    color: TrustfallColors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
})
