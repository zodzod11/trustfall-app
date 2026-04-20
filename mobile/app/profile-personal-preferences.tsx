import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useSaved } from '@/hooks/useSaved'
import { formatDisplayLabel } from '@/lib/formatDisplayLabel'
import { fetchProfileScreenModel, type ProfileScreenModel } from '@/lib/profileScreenData'
import { getActivityPreferenceCategories, savePersonalBudgetRange } from '@/lib/profilePreferences'
import { isSupabaseConfigured } from '@/lib/supabase'

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
      <MaterialIcons name="chevron-left" size={24} color={TrustfallColors.foreground} />
      <Text style={styles.backText}>Profile</Text>
    </Pressable>
  )
}

export default function PersonalPreferencesScreen() {
  const { savedPortfolioItemIds, savedProfessionalIds, requestSubmissions } = useSaved()
  const [me, setMe] = useState<ProfileScreenModel | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [budgetMinDraft, setBudgetMinDraft] = useState('')
  const [budgetMaxDraft, setBudgetMaxDraft] = useState('')

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
        setBudgetMinDraft(next.budgetMin)
        setBudgetMaxDraft(next.budgetMax)
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

  const activityCategories = useMemo(
    () =>
      getActivityPreferenceCategories({
        savedPortfolioItemIds,
        savedProfessionalIds,
        requestSubmissions,
      }),
    [requestSubmissions, savedPortfolioItemIds, savedProfessionalIds],
  )

  const saveBudget = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await savePersonalBudgetRange({
        budgetMin: budgetMinDraft,
        budgetMax: budgetMaxDraft,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await reload()
    } finally {
      setSaving(false)
    }
  }, [budgetMaxDraft, budgetMinDraft, reload])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.title}>Personal preferences</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator color={TrustfallColors.primary} style={styles.loader} />
        ) : !me ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              {isSupabaseConfigured
                ? 'Sign in to manage your personal preferences.'
                : 'Supabase is not configured yet for this app.'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Based on your activity</Text>
              <Text style={styles.body}>
                Saved looks, saved pros, and request history help Trustfall learn what you want to see more of.
              </Text>
              <View style={styles.tagRow}>
                {activityCategories.length > 0 ? (
                  activityCategories.map((category) => (
                    <View key={category} style={styles.tag}>
                      <Text style={styles.tagText}>{formatDisplayLabel(category)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.body}>No activity-based preferences yet.</Text>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Budget</Text>
              <Text style={styles.body}>
                {me.budgetLabel ? `Current range: ${me.budgetLabel}` : 'No budget range saved yet.'}
              </Text>
              <View style={styles.inputsRow}>
                <TextInput
                  value={budgetMinDraft}
                  onChangeText={setBudgetMinDraft}
                  placeholder="Min"
                  placeholderTextColor={TrustfallColors.muted}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  value={budgetMaxDraft}
                  onChangeText={setBudgetMaxDraft}
                  placeholder="Max"
                  placeholderTextColor={TrustfallColors.muted}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                onPress={() => void saveBudget()}
                disabled={saving}
                style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
              >
                <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save budget'}</Text>
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
    paddingVertical: 4,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: TrustfallColors.foreground,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: TrustfallSpacing.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    paddingVertical: TrustfallSpacing.md,
    paddingHorizontal: TrustfallSpacing.lg,
    fontSize: 15,
    color: TrustfallColors.foreground,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  error: {
    fontSize: 13,
    color: '#fca5a5',
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
