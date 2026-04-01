import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TfButton } from '@/components/ui/TfButton'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { ensureAuthSession } from '@/lib/ensureAuthSession'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/** Circular logo badge — diameter in px; borderRadius = half for a true circle. */
const LOGO_CIRCLE = 236

/** Web: CSS radial gradient (Metro + react-native-svg web shims are brittle). Native: linear approximation. */
const LOGO_FADE_WEB = {
  backgroundImage:
    'radial-gradient(circle at center, transparent 0%, transparent 48%, rgba(47,99,230,0.18) 72%, rgba(11,19,38,0.45) 88%, rgba(11,19,38,0.82) 100%)',
} as const

export default function WelcomeScreen() {
  const [createBusy, setCreateBusy] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  async function onCreateAccount() {
    setCreateErr(null)
    if (!isSupabaseConfigured) {
      setCreateErr('Add Supabase URL and key in your env.')
      return
    }
    setCreateBusy(true)
    try {
      const res = await ensureAuthSession(supabase)
      if (res.needsEmailAuthFallback) {
        router.replace('/sign-up?reason=anonymous_disabled&next=%2Fonboarding')
        return
      }
      if (res.error) {
        setCreateErr(res.error)
        return
      }
      router.replace('/onboarding')
    } finally {
      setCreateBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={['#0b1326', '#121a2e']} style={StyleSheet.absoluteFill} />
      <View style={styles.blobWrap} pointerEvents="none">
        <LinearGradient colors={['rgba(47,99,230,0.35)', 'transparent']} style={styles.blob} />
      </View>

      <View style={styles.column}>
        <View style={styles.hero}>
          <View style={styles.logoStage}>
            <View style={styles.logoFrame}>
              <Image
                source={require('@/assets/images/trustfall-logo.png')}
                style={styles.logo}
                contentFit="contain"
                accessibilityIgnoresInvertColors
              />
              {Platform.OS === 'web' ? (
                <View style={[styles.logoFadeSvg, LOGO_FADE_WEB]} pointerEvents="none" />
              ) : (
                <>
                  {/* Two “tunnel” gradients (H + V) approximate an even radial edge fade on native. */}
                  <LinearGradient
                    colors={[
                      'rgba(11,19,38,0.78)',
                      'rgba(11,19,38,0)',
                      'rgba(11,19,38,0)',
                      'rgba(11,19,38,0.78)',
                    ]}
                    locations={[0, 0.36, 0.64, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={[styles.logoFadeSvg, styles.logoFadeNativeLayer]}
                    pointerEvents="none"
                  />
                  <LinearGradient
                    colors={[
                      'rgba(11,19,38,0.78)',
                      'rgba(11,19,38,0)',
                      'rgba(11,19,38,0)',
                      'rgba(11,19,38,0.78)',
                    ]}
                    locations={[0, 0.36, 0.64, 1]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[styles.logoFadeSvg, styles.logoFadeNativeLayer]}
                    pointerEvents="none"
                  />
                </>
              )}
            </View>
          </View>
          <Text style={styles.tagline}>
            Discover pros whose work matches your vision—visually, not from generic profiles alone.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h1}>Get started</Text>
          <Text style={styles.body}>
            <Text style={styles.bodyStrong}>New?</Text> Start onboarding to create your account and set your
            preferences. <Text style={styles.bodyStrong}>Already have an account?</Text> Sign in below.
          </Text>
          {!isSupabaseConfigured ? (
            <Text style={styles.warn}>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY for auth and
              cloud sync.
            </Text>
          ) : null}
          {createErr ? <Text style={styles.warn}>{createErr}</Text> : null}
          {createBusy ? (
            <ActivityIndicator color={TrustfallColors.primary} />
          ) : (
            <TfButton title="Create account" onPress={() => void onCreateAccount()} />
          )}
          <TfButton
            title="Sign in"
            variant="secondary"
            onPress={() => router.push('/sign-in')}
            disabled={createBusy}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  blobWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    top: -120,
    left: '50%',
    marginLeft: -160,
    width: 320,
    height: 320,
    borderRadius: 200,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: TrustfallSpacing.xxl,
    paddingTop: TrustfallSpacing.xxl,
    justifyContent: 'center',
    gap: TrustfallSpacing.xxl,
  },
  hero: { alignItems: 'center', gap: TrustfallSpacing.xl },
  logoStage: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFrame: {
    width: LOGO_CIRCLE,
    height: LOGO_CIRCLE,
    borderRadius: LOGO_CIRCLE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: TrustfallSpacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: TrustfallColors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.38,
        shadowRadius: 32,
      },
      android: { elevation: 0 },
      default: {},
    }),
  },
  logoFadeSvg: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: LOGO_CIRCLE,
    height: LOGO_CIRCLE,
    borderRadius: LOGO_CIRCLE / 2,
  },
  logoFadeNativeLayer: { opacity: 0.88 },
  logo: {
    width: '100%',
    height: '100%',
    opacity: 0.92,
  },
  tagline: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: TrustfallColors.muted,
  },
  card: {
    backgroundColor: 'rgba(23,31,51,0.92)',
    borderRadius: TrustfallRadius.xl,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    padding: TrustfallSpacing.xxl,
    gap: TrustfallSpacing.lg,
  },
  h1: { fontSize: 22, fontWeight: '700', color: TrustfallColors.foreground, letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22, color: TrustfallColors.muted },
  bodyStrong: { fontWeight: '700', color: TrustfallColors.foreground },
  warn: { fontSize: 12, lineHeight: 18, color: '#fbbf24' },
})
