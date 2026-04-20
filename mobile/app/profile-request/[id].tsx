import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRequestDetail } from '../../../src/hooks/useRequestHistory'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import {
  formatRequestSubmissionDate,
  formatRequestSubmissionTime,
} from '@/lib/requestHistory'
import { formatPhoneNumber } from '@/lib/phone'
import { supabase } from '@/lib/supabase'

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
      <MaterialIcons name="chevron-left" size={24} color={TrustfallColors.foreground} />
      <Text style={styles.backText}>Requests</Text>
    </Pressable>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
    </View>
  )
}

export default function ProfileRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { item: request, loading, error } = useRequestDetail(supabase, id)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.title}>Request details</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <View style={styles.card}>
            <Text style={styles.body}>Loading request details...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Could not load request</Text>
            <Text style={styles.body}>{error}</Text>
          </View>
        ) : !request ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Request not found</Text>
            <Text style={styles.body}>It may have been removed or you may not have access to it.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.proName}>{request.provider_name_snapshot || 'Professional'}</Text>
              <Text style={styles.meta}>
                Sent {formatRequestSubmissionDate(request.created_at)}
                {formatRequestSubmissionTime(request.created_at)
                  ? ` at ${formatRequestSubmissionTime(request.created_at)}`
                  : ''}
              </Text>
              <Text style={styles.preferredDate}>Status: {request.status}</Text>
              {request.preferred_date_text ? (
                <Text style={styles.preferredDate}>Preferred date: {request.preferred_date_text}</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Request</Text>
              <Text style={styles.message}>{request.message || 'No request note provided.'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Contact</Text>
              <InfoRow label="Name" value={request.client_name ?? ''} />
              <InfoRow label="Email" value={request.client_email ?? ''} />
              <InfoRow label="Phone" value={formatPhoneNumber(request.client_phone ?? '')} />
            </View>

            {(request.portfolio_image_url_snapshot ||
              request.inspiration_image_url ||
              request.current_photo_url) ? (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Images</Text>
                <View style={styles.imageGrid}>
                  {request.portfolio_image_url_snapshot ? (
                    <View style={styles.imageWrap}>
                      <Text style={styles.imageLabel}>Portfolio</Text>
                      <Image
                        source={{ uri: request.portfolio_image_url_snapshot }}
                        style={styles.image}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}
                  {request.inspiration_image_url ? (
                    <View style={styles.imageWrap}>
                      <Text style={styles.imageLabel}>Inspiration</Text>
                      <Image
                        source={{ uri: request.inspiration_image_url }}
                        style={styles.image}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}
                  {request.current_photo_url ? (
                    <View style={styles.imageWrap}>
                      <Text style={styles.imageLabel}>Your photo</Text>
                      <Image
                        source={{ uri: request.current_photo_url }}
                        style={styles.image}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
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
  scroll: { padding: TrustfallSpacing.lg, paddingBottom: 100, gap: TrustfallSpacing.lg },
  card: {
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    gap: TrustfallSpacing.md,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TrustfallColors.foreground },
  body: { fontSize: 14, lineHeight: 20, color: TrustfallColors.muted },
  proName: { fontSize: 20, fontWeight: '700', color: TrustfallColors.foreground },
  meta: { fontSize: 13, color: TrustfallColors.muted },
  preferredDate: { fontSize: 14, color: TrustfallColors.secondary },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  message: { fontSize: 15, lineHeight: 22, color: TrustfallColors.foreground },
  infoRow: { gap: 4 },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  infoValue: { fontSize: 14, color: TrustfallColors.foreground },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  imageWrap: { width: '48%', gap: 6 },
  imageLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: TrustfallRadius.md,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
})
