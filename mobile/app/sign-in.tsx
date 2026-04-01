import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TfButton } from '@/components/ui/TfButton'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export default function SignInScreen() {
  const { next: nextParam } = useLocalSearchParams<{ next?: string }>()
  const nextHref =
    typeof nextParam === 'string' && nextParam.startsWith('/') ? nextParam : ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setError(null)
    const e = email.trim()
    if (!e || !password) {
      setError('Enter email and password.')
      return
    }
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and key in your env.')
      return
    }
    setBusy(true)
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: e, password })
      if (signErr) {
        setError(signErr.message)
        return
      }
      if (nextHref) {
        router.replace(nextHref as never)
      } else {
        router.replace('/')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={['#0b1326', '#121a2e']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.column}>
            <Pressable onPress={() => router.back()} style={styles.backWrap}>
              <Text style={styles.back}>← Back</Text>
            </Pressable>

            <Text style={styles.brand}>Trustfall</Text>
            <Text style={styles.subtitle}>Sign in</Text>
            <Text style={styles.helper}>
              For returning users only. New here? Go back and tap <Text style={styles.helperEm}>Create account</Text>{' '}
              to register during onboarding.
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={TrustfallColors.muted}
                style={styles.input}
                editable={!busy}
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                placeholder="••••••••"
                placeholderTextColor={TrustfallColors.muted}
                style={styles.input}
                editable={!busy}
                onSubmitEditing={() => void onSubmit()}
              />
              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              {busy ? (
                <ActivityIndicator color={TrustfallColors.primary} style={styles.spinner} />
              ) : (
                <TfButton title="Sign in" onPress={() => void onSubmit()} />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: TrustfallSpacing.xxl,
    paddingBottom: 32,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingTop: TrustfallSpacing.md,
    gap: TrustfallSpacing.lg,
  },
  backWrap: { alignSelf: 'flex-start', paddingVertical: TrustfallSpacing.sm },
  back: { fontSize: 15, color: TrustfallColors.accent, fontWeight: '600' },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    color: TrustfallColors.accent,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  subtitle: { fontSize: 17, fontWeight: '700', color: TrustfallColors.foreground, textAlign: 'center' },
  helper: {
    fontSize: 13,
    lineHeight: 19,
    color: TrustfallColors.muted,
    textAlign: 'center',
    marginBottom: TrustfallSpacing.md,
    paddingHorizontal: TrustfallSpacing.sm,
  },
  helperEm: { fontWeight: '700', color: TrustfallColors.accent },
  card: {
    backgroundColor: 'rgba(23,31,51,0.92)',
    borderRadius: TrustfallRadius.xl,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    padding: TrustfallSpacing.xxl,
    gap: TrustfallSpacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    padding: TrustfallSpacing.lg,
    fontSize: 16,
    color: TrustfallColors.foreground,
    backgroundColor: TrustfallColors.background,
  },
  error: { fontSize: 13, lineHeight: 18, color: '#f87171' },
  spinner: { paddingVertical: TrustfallSpacing.md },
})
