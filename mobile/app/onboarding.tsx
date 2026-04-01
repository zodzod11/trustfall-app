import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { applyOnboardingCredentials } from '../../src/lib/auth/applyOnboardingCredentials'
import { ensureAuthSession } from '@/lib/ensureAuthSession'
import { onboardingApi } from '@/lib/onboarding'
import { supabase } from '@/lib/supabase'
import type { ServiceCategory } from '@/types'
import {
  canProceedFromStep,
  getSessionIssueHelp,
  isNeedsEmailAuthSessionError,
  ONBOARDING_CATEGORY_OPTIONS,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STYLE_TAG_OPTIONS,
  SESSION_ERROR_NEEDS_EMAIL_AUTH,
  stepTitleAt,
  useOnboardingFlow,
} from '../../src/onboarding'

type ContactPreference = 'text' | 'call' | 'email'

export default function OnboardingScreen() {
  const prepareHydration = useCallback(async () => {
    const session = await ensureAuthSession(supabase)
    if (session.needsEmailAuthFallback) {
      throw new Error(SESSION_ERROR_NEEDS_EMAIL_AUTH)
    }
    if (session.error) throw new Error(session.error)
  }, [])
  const {
    model,
    shouldSkip,
    patchDraft,
    goNext,
    goBack,
    saveProgress,
    clearPersistError,
    complete,
  } = useOnboardingFlow(onboardingApi, { prepareHydration })

  const [syncHint, setSyncHint] = useState<string | null>(null)

  const { stepIndex, draft, hydration, persist } = model
  const form = draft
  const totalSteps = ONBOARDING_STEP_COUNT
  const isLastStep = stepIndex === totalSteps - 1
  const progressValue = ((stepIndex + 1) / totalSteps) * 100
  const personalizedName = form.firstName.trim() || 'there'

  useEffect(() => {
    if (shouldSkip) {
      router.replace('/(tabs)/explore')
    }
  }, [shouldSkip])

  const onboardingReady = hydration.phase === 'ready'

  const redirectingEmailAuth =
    hydration.phase === 'error' && isNeedsEmailAuthSessionError(hydration.message)

  useEffect(() => {
    if (redirectingEmailAuth) {
      router.replace('/sign-up?reason=anonymous_disabled&next=%2Fonboarding')
    }
  }, [redirectingEmailAuth])

  const canContinue = useMemo(() => {
    if (!onboardingReady) return false
    if (persist.phase === 'saving') return false
    return canProceedFromStep(stepIndex, form)
  }, [form, stepIndex, persist.phase, onboardingReady])

  function toggleCategory(category: ServiceCategory) {
    patchDraft({
      categories: form.categories.includes(category)
        ? form.categories.filter((c) => c !== category)
        : [...form.categories, category],
    })
  }

  function toggleStyleTag(tag: string) {
    patchDraft({
      styleTags: form.styleTags.includes(tag)
        ? form.styleTags.filter((t) => t !== tag)
        : [...form.styleTags, tag],
    })
  }

  async function pickInspiration() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (result.canceled || !result.assets[0]) return
    const name = result.assets[0].fileName ?? 'inspiration.jpg'
    patchDraft({ inspirationFileName: name })
  }

  async function handleContinue() {
    if (!onboardingReady) return
    if (!canProceedFromStep(stepIndex, form)) return
    clearPersistError()
    setSyncHint(null)
    const session = await ensureAuthSession(supabase)
    if (session.needsEmailAuthFallback) {
      router.replace('/sign-up?reason=anonymous_disabled&next=%2Fonboarding')
      return
    }
    if (session.error) {
      if (hydration.phase !== 'error') setSyncHint(session.error)
      return
    }
    if (stepIndex === 5) {
      const cred = await applyOnboardingCredentials(supabase, form.email, form.password)
      if (cred.error) {
        setSyncHint(cred.error)
        return
      }
      patchDraft({ password: '' })
    }
    const save = await saveProgress()
    if (!save.ok) {
      clearPersistError()
      setSyncHint(`Could not save: ${save.message}`)
      return
    }
    goNext()
  }

  function previousStep() {
    setSyncHint(null)
    clearPersistError()
    goBack()
  }

  async function finish() {
    if (!onboardingReady) return
    clearPersistError()
    setSyncHint(null)
    const session = await ensureAuthSession(supabase)
    if (session.needsEmailAuthFallback) {
      router.replace('/sign-up?reason=anonymous_disabled&next=%2Fonboarding')
      return
    }
    if (session.error) {
      if (hydration.phase !== 'error') setSyncHint(session.error)
      return
    }
    const result = await complete()
    if (!result.ok) {
      clearPersistError()
      setSyncHint(result.message)
      return
    }
    router.replace('/(tabs)/explore')
  }

  const isHydrating = hydration.phase === 'loading'
  const stepLabel = stepTitleAt(stepIndex)
  const sessionHelp =
    hydration.phase === 'error' && hydration.message ? getSessionIssueHelp(hydration.message) : null

  function exitOnboarding() {
    setSyncHint(null)
    clearPersistError()
    router.replace('/welcome')
  }

  if (redirectingEmailAuth) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <LinearGradient colors={['#0b1326', '#121a2e']} style={StyleSheet.absoluteFill} />
        <View style={styles.redirectWrap}>
          <Text style={styles.syncNote}>Redirecting to sign up…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={['#0b1326', '#121a2e']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.blobWrap} pointerEvents="none">
            <LinearGradient
              colors={['rgba(47,99,230,0.35)', 'transparent']}
              style={styles.blob}
            />
          </View>

          <View style={styles.onboardingColumn}>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <Text style={styles.brand}>Trustfall</Text>
                <View style={styles.headerRight}>
                  {isHydrating ? (
                    <ActivityIndicator size="small" color={TrustfallColors.accent} />
                  ) : (
                    <Text style={styles.stepCount}>
                      {stepIndex + 1}/{totalSteps}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressValue}%` }]} />
              </View>
              <Text style={styles.stepTitle}>{stepLabel}</Text>
              {isHydrating ? (
                <Text style={styles.syncNote}>Loading your saved preferences…</Text>
              ) : null}
              {sessionHelp ? (
                <View style={styles.sessionIssue}>
                  {sessionHelp.lines.map((line, i) => (
                    <Text key={i} style={styles.syncNote}>
                      {line}
                    </Text>
                  ))}
                  {sessionHelp.suggestEmailSignUp ? (
                    <Pressable
                      onPress={() => router.replace('/sign-up?reason=anonymous_disabled&next=%2Fonboarding')}
                      style={styles.signInPress}
                    >
                      <Text style={styles.signInLink}>Create account (email)</Text>
                    </Pressable>
                  ) : null}
                  {sessionHelp.suggestSignIn ? (
                    <Pressable onPress={() => router.replace('/sign-in')} style={styles.signInPress}>
                      <Text style={styles.signInLink}>Sign in</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              {persist.phase === 'error' && persist.message ? (
                <Text style={styles.errorNote} accessibilityRole="alert">
                  {persist.message}
                </Text>
              ) : null}
              {syncHint ? <Text style={styles.syncNote}>{syncHint}</Text> : null}
            </View>

            <View style={[styles.card, (isHydrating || !onboardingReady) && styles.cardDim]}>
            {stepIndex === 0 && (
              <>
                <Text style={styles.h1}>Welcome to Trustfall</Text>
                <Text style={styles.body}>
                  Discover pros whose work already matches your vision—visually, not from generic
                  profiles alone.
                </Text>
                <TextInput
                  value={form.firstName}
                  onChangeText={(t) => patchDraft({ firstName: t })}
                  placeholder="First name"
                  placeholderTextColor={TrustfallColors.muted}
                  style={styles.input}
                />
              </>
            )}

            {stepIndex === 1 && (
              <>
                <Text style={styles.h1}>Nice to meet you, {personalizedName}</Text>
                <Text style={styles.body}>What services are you looking for?</Text>
                <View style={styles.grid2}>
                  {ONBOARDING_CATEGORY_OPTIONS.map((option) => {
                    const active = form.categories.includes(option.value)
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => toggleCategory(option.value)}
                        style={[styles.chipLg, active && styles.chipLgOn]}
                      >
                        <Text style={[styles.chipLgText, active && styles.chipLgTextOn]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </>
            )}

            {stepIndex === 2 && (
              <>
                <Text style={styles.h1}>What style are you into?</Text>
                <Text style={styles.body}>
                  Pick tags and optionally note inspiration (label only — upload photos in Get
                  Matched).
                </Text>
                <View style={styles.tagWrap}>
                  {ONBOARDING_STYLE_TAG_OPTIONS.map((tag) => {
                    const active = form.styleTags.includes(tag)
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => toggleStyleTag(tag)}
                        style={[styles.tag, active && styles.tagOn]}
                      >
                        <Text style={[styles.tagText, active && styles.tagTextOn]}>{tag}</Text>
                      </Pressable>
                    )
                  })}
                </View>
                <TfButton title="Choose inspiration reference" variant="secondary" onPress={pickInspiration} />
                {form.inspirationFileName ? (
                  <Text style={styles.hint}>Reference: {form.inspirationFileName}</Text>
                ) : null}
              </>
            )}

            {stepIndex === 3 && (
              <>
                <Text style={styles.h1}>Where should we search?</Text>
                <Text style={styles.body}>City or neighborhood works best.</Text>
                <TextInput
                  value={form.location}
                  onChangeText={(t) => patchDraft({ location: t })}
                  placeholder="Houston, Austin, Dallas..."
                  placeholderTextColor={TrustfallColors.muted}
                  style={styles.input}
                />
              </>
            )}

            {stepIndex === 4 && (
              <>
                <Text style={styles.h1}>Contact</Text>
                <Text style={styles.body}>
                  Add your email and phone for your profile. Then choose how pros should reach you first.
                </Text>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  value={form.email}
                  onChangeText={(t) => patchDraft({ email: t })}
                  placeholder="you@example.com"
                  placeholderTextColor={TrustfallColors.muted}
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                />
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  value={form.phone}
                  onChangeText={(t) => patchDraft({ phone: t })}
                  placeholder="Mobile number"
                  placeholderTextColor={TrustfallColors.muted}
                  style={styles.input}
                  autoComplete="tel"
                  keyboardType="phone-pad"
                />
                <Text style={styles.body}>Preferred first contact</Text>
                {(['text', 'call', 'email'] as ContactPreference[]).map((pref) => {
                  const active = form.contactPreference === pref
                  return (
                    <Pressable
                      key={pref}
                      onPress={() => patchDraft({ contactPreference: pref })}
                      style={[styles.prefRow, active && styles.prefRowOn]}
                    >
                      <Text style={styles.prefText}>{pref}</Text>
                      {active ? <Text style={styles.prefSel}>Selected</Text> : null}
                    </Pressable>
                  )
                })}
              </>
            )}

            {stepIndex === 5 && (
              <>
                <Text style={styles.h1}>Create your login</Text>
                <Text style={styles.body}>
                  This step saves your email and password in Supabase so your profile stays tied to this
                  account. Use at least 8 characters.
                </Text>
                <TextInput
                  value={form.password}
                  onChangeText={(t) => patchDraft({ password: t })}
                  placeholder="Password"
                  placeholderTextColor={TrustfallColors.muted}
                  style={styles.input}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
              </>
            )}

            {stepIndex === 6 && (
              <>
                <Text style={styles.h1}>You&apos;re set, {personalizedName}</Text>
                <Text style={styles.body}>
                  We&apos;ll prioritize {form.categories.join(', ')} looks near {form.location}.
                </Text>
                <View style={styles.summary}>
                  <Text style={styles.summaryLabel}>Email</Text>
                  <Text style={styles.summaryValue}>{form.email.trim() || '—'}</Text>
                </View>
                <View style={styles.summary}>
                  <Text style={styles.summaryLabel}>Phone</Text>
                  <Text style={styles.summaryValue}>{form.phone.trim() || '—'}</Text>
                </View>
                <View style={styles.summary}>
                  <Text style={styles.summaryLabel}>Style tags</Text>
                  <Text style={styles.summaryValue}>
                    {form.styleTags.length ? form.styleTags.join(', ') : 'None'}
                  </Text>
                </View>
                <TfButton
                  title={persist.phase === 'saving' ? 'Finishing…' : 'Enter Trustfall'}
                  onPress={finish}
                  disabled={persist.phase === 'saving' || !onboardingReady}
                />
              </>
            )}
          </View>

          {!isLastStep ? (
            <View style={styles.footer}>
              {stepIndex > 0 ? (
                <TfButton title="Back" variant="secondary" onPress={previousStep} style={styles.footerBtn} />
              ) : (
                <TfButton title="Exit" variant="secondary" onPress={exitOnboarding} style={styles.footerBtn} />
              )}
              <TfButton
                title={persist.phase === 'saving' ? 'Saving…' : 'Continue'}
                onPress={() => void handleContinue()}
                disabled={!canContinue}
                style={styles.footerBtn}
              />
            </View>
          ) : (
            <Text style={styles.note}>
              Finishing saves your profile and preferences to Supabase and unlocks the app.
            </Text>
          )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  redirectWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: TrustfallSpacing.xxl,
  },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: TrustfallSpacing.xxl, paddingBottom: 32, flexGrow: 1 },
  onboardingColumn: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: TrustfallSpacing.lg,
    marginTop: TrustfallSpacing.sm,
  },
  blobWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 200,
  },
  header: { gap: TrustfallSpacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { minWidth: 48, alignItems: 'flex-end' },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: TrustfallColors.accent,
    textTransform: 'uppercase',
  },
  stepCount: { fontSize: 13, color: TrustfallColors.muted, fontWeight: '600' },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: TrustfallColors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: TrustfallColors.primary,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  sessionIssue: { gap: TrustfallSpacing.sm },
  syncNote: { fontSize: 11, lineHeight: 16, color: TrustfallColors.muted },
  signInPress: { alignSelf: 'flex-start', marginTop: TrustfallSpacing.xs },
  signInLink: { fontSize: 12, fontWeight: '700', color: TrustfallColors.primary },
  errorNote: { fontSize: 11, lineHeight: 16, color: '#f87171' },
  card: {
    backgroundColor: 'rgba(23,31,51,0.92)',
    borderRadius: TrustfallRadius.xl,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    padding: TrustfallSpacing.xxl,
    gap: TrustfallSpacing.lg,
  },
  cardDim: { opacity: 0.72 },
  h1: { fontSize: 24, fontWeight: '700', color: TrustfallColors.foreground, letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22, color: TrustfallColors.muted },
  input: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    padding: TrustfallSpacing.lg,
    fontSize: 16,
    color: TrustfallColors.foreground,
    backgroundColor: TrustfallColors.background,
  },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.md },
  chipLg: {
    width: '47%',
    paddingVertical: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    alignItems: 'center',
    backgroundColor: TrustfallColors.background,
  },
  chipLgOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: 'rgba(47,99,230,0.2)',
  },
  chipLgText: { fontSize: 14, fontWeight: '600', color: TrustfallColors.muted },
  chipLgTextOn: { color: TrustfallColors.foreground },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  tag: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: 999,
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.sm,
    backgroundColor: TrustfallColors.background,
  },
  tagOn: { borderColor: TrustfallColors.primary, backgroundColor: 'rgba(47,99,230,0.15)' },
  tagText: { fontSize: 12, fontWeight: '600', color: TrustfallColors.muted, textTransform: 'capitalize' },
  tagTextOn: { color: TrustfallColors.foreground },
  hint: { fontSize: 12, color: TrustfallColors.secondary },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.lg,
    padding: TrustfallSpacing.lg,
    backgroundColor: TrustfallColors.background,
  },
  prefRowOn: { borderColor: TrustfallColors.primary, backgroundColor: 'rgba(47,99,230,0.12)' },
  prefText: { fontSize: 15, fontWeight: '600', color: TrustfallColors.foreground, textTransform: 'capitalize' },
  prefSel: { fontSize: 12, color: TrustfallColors.accent, fontWeight: '600' },
  summary: {
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    gap: TrustfallSpacing.sm,
  },
  summaryLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: TrustfallColors.muted, textTransform: 'uppercase' },
  summaryValue: { fontSize: 14, color: TrustfallColors.secondary },
  footer: { flexDirection: 'row', gap: TrustfallSpacing.md },
  footerBtn: { flex: 1 },
  note: { textAlign: 'center', fontSize: 12, color: TrustfallColors.muted },
})
