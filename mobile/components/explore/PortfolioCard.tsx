import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { Image as RNImage, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { TfCard } from '@/components/ui/TfCard'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import type { PortfolioFeedItem, ServiceCategory } from '@/types'
import { TfTag } from '@/components/ui/TfTag'

const categoryLabel: Record<ServiceCategory, string> = {
  barber: 'Barber',
  hair: 'Hair',
  nails: 'Nails',
  makeup: 'Makeup',
}

type Props = {
  item: PortfolioFeedItem
  view?: 'list' | 'grid'
}

export function PortfolioCard({ item, view = 'list' }: Props) {
  if (view === 'grid') {
    return (
      <View style={styles.gridWrap}>
        <Link href={`/explore/${item.id}`} asChild>
          <Pressable style={({ pressed }) => [styles.gridCardPressable, pressed && styles.pressed]}>
            {/* Image in normal flow with explicit aspectRatio — avoids broken layers on web / expo-image + absoluteFill */}
            <View style={styles.gridImageFrame}>
              {Platform.OS === 'web' ? (
                <RNImage
                  source={{ uri: item.afterImageUrl }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={{ uri: item.afterImageUrl }}
                  style={styles.gridImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}
              <View style={styles.gridOverlay} pointerEvents="none">
                <View style={styles.gridCategory}>
                  <Text style={styles.gridCategoryText}>{categoryLabel[item.category]}</Text>
                </View>
                <View style={styles.pricePill}>
                  <Text style={styles.priceText}>${item.price}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Link>
        <View style={styles.gridMeta}>
          <Link href={`/explore/${item.id}`} asChild>
            <Pressable>
              <Text style={styles.gridTitle} numberOfLines={2}>
                {item.serviceTitle}
              </Text>
            </Pressable>
          </Link>
          <Link href={`/pro/${item.professionalId}`} asChild>
            <Pressable>
              <Text style={styles.proName} numberOfLines={1}>
                {item.professionalName}
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    )
  }

  return (
    <TfCard style={styles.listCard}>
      <Link href={`/explore/${item.id}`} asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.listImageRow}>
            <Image source={{ uri: item.afterImageUrl }} style={styles.listImage} contentFit="cover" />
            <View style={styles.tagAbs}>
              <TfTag label={categoryLabel[item.category]} />
            </View>
            <View style={styles.beforeThumb}>
              <Image source={{ uri: item.beforeImageUrl }} style={styles.beforeImage} contentFit="cover" />
            </View>
            <View style={styles.listPrice}>
              <Text style={styles.priceText}>${item.price}</Text>
            </View>
          </View>
        </Pressable>
      </Link>
      <View style={styles.listBody}>
        <Link href={`/explore/${item.id}`} asChild>
          <Pressable>
            <Text style={styles.serviceTitle}>{item.serviceTitle}</Text>
          </Pressable>
        </Link>
        <Text style={styles.metaLine} numberOfLines={1}>
          {item.professionalName} · {item.location}
        </Text>
        <View style={styles.tagRow}>
          {item.tags.slice(0, 3).map((t) => (
            <Text key={t} style={styles.smallTag}>
              {t}
            </Text>
          ))}
        </View>
      </View>
    </TfCard>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  gridWrap: { width: '100%', gap: TrustfallSpacing.sm },
  gridCardPressable: {
    width: '100%',
    borderRadius: TrustfallRadius.xl,
    overflow: 'hidden',
  },
  gridImageFrame: {
    width: '100%',
    position: 'relative',
    borderRadius: TrustfallRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0e1528',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  gridCategory: {
    alignSelf: 'flex-start',
    marginLeft: TrustfallSpacing.md,
    marginTop: TrustfallSpacing.md,
    backgroundColor: 'rgba(11,19,38,0.65)',
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gridCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#fff',
  },
  pricePill: {
    alignSelf: 'flex-end',
    marginRight: TrustfallSpacing.md,
    marginBottom: TrustfallSpacing.md,
    backgroundColor: TrustfallColors.primary,
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.sm,
    borderRadius: 999,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '800',
    color: TrustfallColors.primaryForeground,
  },
  gridMeta: { paddingHorizontal: 2, gap: 4, paddingTop: 2 },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TrustfallColors.foreground,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  proName: { fontSize: 12, fontWeight: '600', color: TrustfallColors.muted },
  listCard: { padding: 0, overflow: 'hidden' },
  listImageRow: {
    position: 'relative',
    aspectRatio: 4 / 5,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  listImage: { width: '100%', height: '100%' },
  tagAbs: { position: 'absolute', left: TrustfallSpacing.md, top: TrustfallSpacing.md },
  beforeThumb: {
    position: 'absolute',
    bottom: TrustfallSpacing.md,
    right: TrustfallSpacing.md,
    width: 72,
    height: 88,
    borderRadius: TrustfallRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TrustfallColors.border,
  },
  beforeImage: { width: '100%', height: '100%' },
  listPrice: {
    position: 'absolute',
    bottom: TrustfallSpacing.md,
    left: TrustfallSpacing.md,
    backgroundColor: TrustfallColors.primary,
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.xs,
    borderRadius: TrustfallRadius.md,
  },
  listBody: { padding: TrustfallSpacing.lg, gap: TrustfallSpacing.sm },
  serviceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TrustfallColors.foreground,
    letterSpacing: -0.3,
  },
  metaLine: { fontSize: 13, color: TrustfallColors.muted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  smallTag: {
    fontSize: 11,
    color: TrustfallColors.secondary,
    fontWeight: '500',
  },
})
