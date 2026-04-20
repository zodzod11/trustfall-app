import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRequestHistory } from '../../src/hooks/useRequestHistory'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import {
  buildRequestSubmissionPreview,
  formatRequestSubmissionDate,
  getRequestSubmissionId,
} from '@/lib/requestHistory'
import { supabase } from '@/lib/supabase'

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
      <MaterialIcons name="chevron-left" size={24} color={TrustfallColors.foreground} />
      <Text style={styles.backText}>Profile</Text>
    </Pressable>
  )
}

export default function ProfileRequestsScreen() {
  const { items: requestHistory, loading, error } = useRequestHistory(supabase, { limit: 100 })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.title}>All requests</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <View style={styles.card}>
            <Text style={styles.body}>Loading your requests...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Could not load requests</Text>
            <Text style={styles.body}>{error}</Text>
          </View>
        ) : requestHistory.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.body}>Send one from Match results or Explore to see it here.</Text>
          </View>
        ) : (
          requestHistory.map((request) => {
            const requestId = getRequestSubmissionId(request)
            return (
              <Pressable
                key={requestId}
                onPress={() => router.push(`/profile-request/${encodeURIComponent(requestId)}`)}
                style={styles.row}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {request.provider_name_snapshot || 'Professional'}
                  </Text>
                  <Text style={styles.rowMeta}>{formatRequestSubmissionDate(request.created_at)}</Text>
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {buildRequestSubmissionPreview(request)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={TrustfallColors.muted} />
              </Pressable>
            )
          })
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
  backBtn: { minWidth: 88, flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 15, fontWeight: '600', color: TrustfallColors.foreground },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: TrustfallColors.foreground,
  },
  topSpacer: { minWidth: 88 },
  scroll: { padding: TrustfallSpacing.lg, paddingBottom: 100, gap: TrustfallSpacing.sm },
  card: {
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    gap: TrustfallSpacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TrustfallColors.foreground },
  body: { fontSize: 14, lineHeight: 20, color: TrustfallColors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.md,
    paddingHorizontal: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: TrustfallColors.foreground },
  rowMeta: { fontSize: 12, color: TrustfallColors.muted },
  rowPreview: { fontSize: 13, color: TrustfallColors.secondary },
})
