import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { formatDisplayLabel } from '@/lib/formatDisplayLabel'
import { formatPhoneNumber } from '@/lib/phone'
import { fetchProfileScreenModel, type ProfileScreenModel } from '@/lib/profileScreenData'
import { saveOnboardingPreferences } from '@/lib/profilePreferences'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ONBOARDING_CATEGORY_OPTIONS, ONBOARDING_STYLE_TAG_OPTIONS } from '../../src/onboarding'
import type { ContactPreference } from '../../src/services/onboarding/types'

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
      <MaterialIcons name="chevron-left" size={24} color={TrustfallColors.foreground} />
      <Text style={styles.backText}>Profile</Text>
    </Pressable>
  )
}

const CONTACT_PREFERENCE_OPTIONS: ContactPreference[] = ['text', 'call', 'email']

export default function OnboardingPreferencesScreen() {
  const [me, setMe] = useState<ProfileScreenModel | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preferredDraft, setPreferredDraft] = useState<string[]>([])
  const [firstNameDraft, setFirstNameDraft] = useState('')
  const [locationDraft, setLocationDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')
  const [inspirationDraft, setInspirationDraft] = useState('')
  const [styleTagsDraft, setStyleTagsDraft] = useState<string[]>([])
  const [contactPreferenceDraft, setContactPreferenceDraft] = useState<ContactPreference | null>(null)

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setMe(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const next = await fetchProfileScreenModel()
      setMe(next)
      if (next) {
        setPreferredDraft(next.onboarding.categories)
        setFirstNameDraft(next.onboarding.firstName)
        setLocationDraft(next.onboarding.location)
        setEmailDraft(next.onboarding.email)
        setPhoneDraft(formatPhoneNumber(next.onboarding.phone))
        setInspirationDraft(next.onboarding.inspirationFileName)
        setStyleTagsDraft(next.onboarding.styleTags)
        setContactPreferenceDraft(next.onboarding.contactPreference)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload]),
  )

  const editableCategories = useMemo(
    () =>
      Array.from(
        new Set([
          ...ONBOARDING_CATEGORY_OPTIONS.map((option) => option.value),
          ...(me?.onboarding.categories ?? []),
        ]),
      ),
    [me?.onboarding.categories],
  )

  const editableStyleTags = useMemo(
    () => Array.from(new Set([...ONBOARDING_STYLE_TAG_OPTIONS, ...(me?.onboarding.styleTags ?? [])])),
    [me?.onboarding.styleTags],
  )

  function togglePreferredCategory(category: string) {
    setPreferredDraft((current) =>
      current.includes(category) ? current.filter((value) => value !== category) : [...current, category],
    )
  }

  function toggleStyleTag(tag: string) {
    setStyleTagsDraft((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag],
    )
  }

  const savePreferences = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await saveOnboardingPreferences({
        firstName: firstNameDraft,
        categories: preferredDraft,
        styleTags: styleTagsDraft,
        inspirationFileName: inspirationDraft,
        location: locationDraft,
        contactPreference: contactPreferenceDraft,
        email: emailDraft,
        phone: phoneDraft,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await reload()
    } finally {
      setSaving(false)
    }
  }, [
    contactPreferenceDraft,
    emailDraft,
    firstNameDraft,
    inspirationDraft,
    locationDraft,
    phoneDraft,
    preferredDraft,
    reload,
    styleTagsDraft,
  ])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.title}>Onboarding preferences</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator color={TrustfallColors.primary} style={styles.loader} />
        ) : !me ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              {isSupabaseConfigured
                ? 'Sign in to manage your onboarding preferences.'
                : 'Supabase is not configured yet for this app.'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Your selected categories</Text>
              <Text style={styles.body}>
                These are the categories you picked during onboarding and they shape your Explore feed.
              </Text>
              <View style={styles.tagRow}>
                {editableCategories.map((category) => {
                  const active = preferredDraft.includes(category)
                  return (
                    <Pressable
                      key={category}
                      onPress={() => togglePreferredCategory(category)}
                      style={[styles.tag, active && styles.tagOn]}
                    >
                      <Text style={[styles.tagText, active && styles.tagTextOn]}>{formatDisplayLabel(category)}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Other onboarding choices</Text>
              <Text style={styles.body}>
                Update any onboarding choice here and save it back to your profile.
              </Text>

              <View style={styles.formSection}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    value={firstNameDraft}
                    onChangeText={setFirstNameDraft}
                    placeholder="Your first name"
                    placeholderTextColor={TrustfallColors.muted}
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Location</Text>
                  <TextInput
                    value={locationDraft}
                    onChangeText={setLocationDraft}
                    placeholder="City or area"
                    placeholderTextColor={TrustfallColors.muted}
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Contact preference</Text>
                  <View style={styles.tagRow}>
                    {CONTACT_PREFERENCE_OPTIONS.map((pref) => {
                      const active = contactPreferenceDraft === pref
                      return (
                        <Pressable
                          key={pref}
                          onPress={() => setContactPreferenceDraft(pref)}
                          style={[styles.tag, active && styles.tagOn]}
                        >
                          <Text style={[styles.tagText, active && styles.tagTextOn]}>{formatDisplayLabel(pref)}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    value={emailDraft}
                    onChangeText={setEmailDraft}
                    placeholder="Email"
                    placeholderTextColor={TrustfallColors.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <TextInput
                    value={phoneDraft}
                    onChangeText={(value) => setPhoneDraft(formatPhoneNumber(value))}
                    placeholder="Phone number"
                    placeholderTextColor={TrustfallColors.muted}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Inspiration reference</Text>
                  <TextInput
                    value={inspirationDraft}
                    onChangeText={setInspirationDraft}
                    placeholder="Reference label"
                    placeholderTextColor={TrustfallColors.muted}
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Style tags</Text>
                  <View style={styles.tagRow}>
                    {editableStyleTags.map((tag) => {
                      const active = styleTagsDraft.includes(tag)
                      return (
                        <Pressable
                          key={tag}
                          onPress={() => toggleStyleTag(tag)}
                          style={[styles.tag, active && styles.tagOn]}
                        >
                          <Text style={[styles.tagText, active && styles.tagTextOn]}>{formatDisplayLabel(tag)}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                onPress={() => void savePreferences()}
                disabled={saving}
                style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
              >
                <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save onboarding preferences'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TrustfallSpacing.lg,
    paddingVertical: TrustfallSpacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TrustfallColors.border,
  },
  backBtn: {
    minWidth: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: TrustfallColors.foreground,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: TrustfallColors.foreground,
    letterSpacing: -0.3,
  },
  topSpacer: { minWidth: 88 },
  scroll: {
    padding: TrustfallSpacing.lg,
    paddingBottom: 100,
    gap: TrustfallSpacing.lg,
  },
  loader: { paddingVertical: TrustfallSpacing.xxl },
  card: {
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    gap: TrustfallSpacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: TrustfallColors.secondary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TrustfallSpacing.sm,
  },
  tag: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: 999,
    paddingHorizontal: TrustfallSpacing.sm,
    paddingVertical: 6,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  tagOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: 'rgba(47,99,230,0.18)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: TrustfallColors.foreground,
  },
  tagTextOn: {
    color: TrustfallColors.foreground,
  },
  error: {
    fontSize: 13,
    color: '#fca5a5',
  },
  formSection: {
    gap: TrustfallSpacing.md,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    paddingVertical: TrustfallSpacing.md,
    paddingHorizontal: TrustfallSpacing.lg,
    fontSize: 15,
    color: TrustfallColors.foreground,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: TrustfallRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TrustfallSpacing.lg,
    backgroundColor: TrustfallColors.primary,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: TrustfallColors.primaryForeground,
  },
})
