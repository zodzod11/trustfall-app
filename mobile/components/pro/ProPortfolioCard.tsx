import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import type { PortfolioFeedItem, ServiceCategory } from '@/types'

const categoryLabel: Record<ServiceCategory, string> = {
  hair: 'Hair',
  nails: 'Nails',
  makeup: 'Makeup',
  tattoo: 'Tattoo',
}

type Props = {
  item: PortfolioFeedItem
  view: 'grid' | 'list'
  width?: number
}

function formatDuration(minutes?: number) {
  if (!minutes || minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`
}

export function ProPortfolioCard({ item, view, width }: Props) {
  const serviceType = item.serviceType?.trim() || categoryLabel[item.category]
  const duration = formatDuration(item.durationMinutes)

  if (view === 'grid') {
    return (
      <Link href={`/explore/${item.id}`} asChild>
        <Pressable style={({ pressed }) => [styles.gridCard, width ? { width } : null, pressed && styles.pressed]}>
          <View style={styles.gridImageWrap}>
            <Image source={{ uri: item.afterImageUrl }} style={styles.gridImage} contentFit="cover" />
            <View style={styles.gridPriceBadge}>
              <Text style={styles.gridPriceText}>${item.price}</Text>
            </View>
            <View style={styles.gridTypeBadge}>
              <Text style={styles.gridTypeText}>{serviceType}</Text>
            </View>
            <View style={styles.gridBeforeInset}>
              <Text style={styles.gridBeforeInsetLabel}>Before</Text>
              <Image source={{ uri: item.beforeImageUrl }} style={styles.gridBeforeInsetImage} contentFit="cover" />
            </View>
          </View>
          <View style={styles.gridBody}>
            <Text style={styles.gridTitle} numberOfLines={2}>
              {item.serviceTitle}
            </Text>
          </View>
        </Pressable>
      </Link>
    )
  }

  return (
    <Link href={`/explore/${item.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
        <View style={styles.listMediaRow}>
          <View style={styles.listImagePanel}>
            <Text style={styles.listImageLabel}>Before</Text>
            <Image source={{ uri: item.beforeImageUrl }} style={styles.listImage} contentFit="cover" />
          </View>
          <View style={styles.listImagePanel}>
            <Text style={styles.listImageLabel}>After</Text>
            <Image source={{ uri: item.afterImageUrl }} style={styles.listImage} contentFit="cover" />
          </View>
        </View>
        <View style={styles.listBody}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle} numberOfLines={2}>
              {item.serviceTitle}
            </Text>
            <View style={styles.listPriceBadge}>
              <Text style={styles.listPriceText}>${item.price}</Text>
            </View>
          </View>
          <Text style={styles.listMeta} numberOfLines={1}>
            {duration ? `${serviceType} · ${duration}` : serviceType}
          </Text>
          <Text style={styles.listDescription} numberOfLines={3}>
            {item.description?.trim() || 'Explore this look and pricing details from the professional portfolio.'}
          </Text>
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  gridCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: TrustfallColors.surface,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  gridImageWrap: {
    position: 'relative',
    aspectRatio: 0.86,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPriceBadge: {
    position: 'absolute',
    left: TrustfallSpacing.sm,
    bottom: TrustfallSpacing.sm,
    borderRadius: 999,
    backgroundColor: TrustfallColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gridPriceText: {
    color: TrustfallColors.primaryForeground,
    fontSize: 12,
    fontWeight: '800',
  },
  gridTypeBadge: {
    position: 'absolute',
    left: TrustfallSpacing.sm,
    top: TrustfallSpacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(11,19,38,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gridTypeText: {
    color: TrustfallColors.foreground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  gridBeforeInset: {
    position: 'absolute',
    right: TrustfallSpacing.sm,
    bottom: TrustfallSpacing.sm,
    width: 72,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: '#0b1326',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  gridBeforeInsetLabel: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: TrustfallColors.foreground,
    backgroundColor: 'rgba(11,19,38,0.92)',
  },
  gridBeforeInsetImage: {
    width: '100%',
    height: 72,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  gridBody: {
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.md,
  },
  gridTitle: {
    color: TrustfallColors.foreground,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  listCard: {
    padding: TrustfallSpacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  listMediaRow: {
    flexDirection: 'row',
    gap: TrustfallSpacing.sm,
  },
  listImagePanel: {
    flex: 1,
    gap: TrustfallSpacing.xs,
  },
  listImageLabel: {
    color: TrustfallColors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  listImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  listBody: {
    marginTop: TrustfallSpacing.md,
    gap: 8,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: TrustfallSpacing.sm,
  },
  listTitle: {
    flex: 1,
    color: TrustfallColors.foreground,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  listPriceBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(47, 99, 230, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(47, 99, 230, 0.32)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  listPriceText: {
    color: TrustfallColors.foreground,
    fontSize: 13,
    fontWeight: '800',
  },
  listMeta: {
    color: TrustfallColors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  listDescription: {
    color: TrustfallColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
})
