import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Image as RNImage, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { TfCard } from '@/components/ui/TfCard'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { formatDisplayLabel } from '@/lib/formatDisplayLabel'
import type { PortfolioFeedItem, ServiceCategory } from '@/types'
import { TfTag } from '@/components/ui/TfTag'

const categoryLabel: Record<ServiceCategory, string> = {
  hair: 'Hair',
  nails: 'Nails',
  makeup: 'Makeup',
  tattoo: 'Tattoo',
}

/** Before PiP width as a fraction of the hero image width; height keeps 9:11 (legacy 72×88). */
const BEFORE_THUMB_WIDTH_RATIO = 0.25
const BEFORE_THUMB_H_PER_W = 88 / 72

/** Space reserved under the hero for grid title lines when Explore pins `gridSlotHeight` (avoids flex collapse through `Link`/`Slot`). */
const GRID_SLOT_GAP = 4
const GRID_SLOT_META_RESERVE = 46

/** Space reserved for list title/meta when Explore pins `listSlotHeight`. */
const LIST_SLOT_BODY_RESERVE = 92

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

type Props = {
  item: PortfolioFeedItem
  view?: 'list' | 'grid'
  /** When set (Explore), grid shows 2×2 in the measured viewport — image + meta fill this height. */
  gridSlotHeight?: number
  /** When set (Explore), list card fills one viewport — one card visible per “page”. */
  listSlotHeight?: number
}

export function PortfolioCard({
  item,
  view = 'list',
  gridSlotHeight,
  listSlotHeight,
}: Props) {
  const [heroFrameW, setHeroFrameW] = useState(0)

  const beforeThumbW =
    heroFrameW > 0 ? Math.round(heroFrameW * BEFORE_THUMB_WIDTH_RATIO) : 56
  const beforeThumbH = Math.round(beforeThumbW * BEFORE_THUMB_H_PER_W)

  if (view === 'grid') {
    const edge = heroFrameW > 0 ? clamp(heroFrameW * 0.045, 6, 14) : TrustfallSpacing.md
    const catPadH = heroFrameW > 0 ? clamp(heroFrameW * 0.035, 5, 10) : TrustfallSpacing.xs
    const catPadW = heroFrameW > 0 ? clamp(heroFrameW * 0.045, 8, 14) : TrustfallSpacing.md
    const catFont = heroFrameW > 0 ? clamp(heroFrameW * 0.065, 8, 11) : 10
    const priceFont = heroFrameW > 0 ? clamp(heroFrameW * 0.075, 10, 13) : 12
    const pricePadV = heroFrameW > 0 ? clamp(heroFrameW * 0.03, 4, 8) : TrustfallSpacing.sm
    const pricePadH = heroFrameW > 0 ? clamp(heroFrameW * 0.045, 8, 14) : TrustfallSpacing.md

    const slotH = gridSlotHeight
    const heroImageStyle = slotH ? styles.gridImageFill : styles.gridImage
    const imageFrameStyle = slotH
      ? [styles.gridImageFrame, styles.gridImageFrameFillSlot]
      : styles.gridImageFrame

    const gridHeroBlockRaw =
      slotH != null ? slotH - GRID_SLOT_GAP - GRID_SLOT_META_RESERVE : undefined
    const gridHeroBlockHeight =
      slotH != null
        ? gridHeroBlockRaw != null && gridHeroBlockRaw > 0
          ? gridHeroBlockRaw
          : Math.max(40, Math.round(slotH * 0.55))
        : undefined

    const gridHero = (
      <Link href={`/explore/${item.id}`} asChild>
        <Pressable
          style={({ pressed }) => [
            styles.gridCardPressable,
            ...(slotH ? [styles.gridCardPressableFillSlot] : []),
            pressed && styles.pressed,
          ]}
        >
          <View style={imageFrameStyle} onLayout={(e) => setHeroFrameW(e.nativeEvent.layout.width)}>
            {Platform.OS === 'web' ? (
              <RNImage source={{ uri: item.afterImageUrl }} style={heroImageStyle} resizeMode="cover" />
            ) : (
              <Image
                source={{ uri: item.afterImageUrl }}
                style={heroImageStyle}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            )}
            <View style={styles.gridOverlay} pointerEvents="none">
              <View
                style={[
                  styles.gridCategory,
                  {
                    marginLeft: edge,
                    marginTop: edge,
                    paddingHorizontal: catPadW,
                    paddingVertical: catPadH,
                  },
                ]}
              >
                <Text style={[styles.gridCategoryText, { fontSize: catFont }]}>{categoryLabel[item.category]}</Text>
              </View>
              <View
                style={[
                  styles.pricePill,
                  {
                    marginLeft: edge,
                    marginBottom: edge,
                    paddingHorizontal: pricePadH,
                    paddingVertical: pricePadV,
                  },
                ]}
              >
                <Text style={[styles.priceText, { fontSize: priceFont }]}>${item.price}</Text>
              </View>
            </View>
            <View
              style={[
                styles.gridBeforeInset,
                {
                  width: beforeThumbW,
                  height: beforeThumbH,
                  right: edge,
                  bottom: edge,
                },
              ]}
              pointerEvents="none"
            >
              {Platform.OS === 'web' ? (
                <RNImage
                  source={{ uri: item.beforeImageUrl }}
                  style={styles.gridBeforeInsetImage}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={{ uri: item.beforeImageUrl }}
                  style={styles.gridBeforeInsetImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}
            </View>
          </View>
        </Pressable>
      </Link>
    )

    return (
      <View style={[styles.gridWrap, slotH ? { height: slotH, overflow: 'hidden' } : undefined]}>
        {slotH ? <View style={[styles.gridHeroBlock, { height: gridHeroBlockHeight }]}>{gridHero}</View> : gridHero}
        <View style={styles.gridMeta}>
          <Link href={`/explore/${item.id}`} asChild>
            <Pressable>
              <Text style={styles.gridTitle} numberOfLines={1}>
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

  const listHeroBlockRaw =
    listSlotHeight != null ? listSlotHeight - LIST_SLOT_BODY_RESERVE : undefined
  const listHeroBlockHeight =
    listSlotHeight != null
      ? listHeroBlockRaw != null && listHeroBlockRaw > 0
        ? listHeroBlockRaw
        : Math.max(80, Math.round(listSlotHeight * 0.55))
      : undefined

  const listBody = (
    <View style={[styles.listBody, listSlotHeight ? styles.listBodySlot : undefined]}>
      <Link href={`/explore/${item.id}`} asChild>
        <Pressable>
          <Text style={styles.serviceTitle} numberOfLines={2}>
            {item.serviceTitle}
          </Text>
        </Pressable>
      </Link>
      <Text style={styles.metaLine} numberOfLines={1}>
        {item.professionalName} · {item.location}
      </Text>
      <View style={styles.tagRow}>
        {item.tags.slice(0, 2).map((t, index) => (
          <Text key={t} style={styles.smallTag}>
            {index > 0 ? '· ' : ''}
            {formatDisplayLabel(t)}
          </Text>
        ))}
      </View>
    </View>
  )

  const listImageRowSizing = [
    styles.listImageRow,
    listSlotHeight ? styles.listImageRowFillSlot : styles.listImageRowAspect,
  ]

  const listHeroInner = (
    <Link href={`/explore/${item.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          ...(listSlotHeight ? [styles.listHeroPressableFill] : []),
          pressed && styles.pressed,
        ]}
      >
        <View
          style={listImageRowSizing}
          onLayout={(e) => setHeroFrameW(e.nativeEvent.layout.width)}
        >
          <Image source={{ uri: item.afterImageUrl }} style={styles.listImage} contentFit="cover" />
          <View style={styles.tagAbs}>
            <TfTag label={categoryLabel[item.category]} />
          </View>
          <View
            style={[
              styles.beforeThumb,
              { width: beforeThumbW, height: beforeThumbH },
            ]}
          >
            <Image source={{ uri: item.beforeImageUrl }} style={styles.beforeImage} contentFit="cover" />
          </View>
          <View style={styles.listPrice}>
            <Text style={styles.priceText}>${item.price}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  )

  const listHero = listSlotHeight ? (
    <View style={[styles.listHeroBlockList, { height: listHeroBlockHeight }]}>{listHeroInner}</View>
  ) : (
    listHeroInner
  )

  if (listSlotHeight) {
    return (
      <TfCard style={[styles.listCard, { height: listSlotHeight }]}>
        <View style={styles.listCardColumn}>
          {listHero}
          {listBody}
        </View>
      </TfCard>
    )
  }

  return (
    <TfCard style={styles.listCard}>
      {listHero}
      {listBody}
    </TfCard>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  /** Tight vertical rhythm so 2×2 grid fits on common phone viewports. */
  gridWrap: { width: '100%', gap: 4 },
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
  /** Hero frame fills the fixed-height block from Explore (`gridSlotHeight`); avoids flex collapse via `Link`/`Slot`. */
  gridImageFrameFillSlot: {
    height: '100%',
  },
  gridHeroBlock: {
    width: '100%',
  },
  gridCardPressableFillSlot: {
    height: '100%',
  },
  /** Square tiles — shorter than 3:4 so four cards + chrome fit above the tab bar. */
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  /** Fills the flex hero frame when Explore passes `gridSlotHeight`. */
  gridImageFill: {
    width: '100%',
    height: '100%',
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  /** Same PiP placement as list: price bottom-left, before thumb bottom-right (`beforeThumb`). Size/edges from layout. */
  gridBeforeInset: {
    position: 'absolute',
    borderRadius: TrustfallRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    zIndex: 3,
  },
  gridBeforeInsetImage: { width: '100%', height: '100%' },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  gridCategory: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(11,19,38,0.65)',
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
    alignSelf: 'flex-start',
    backgroundColor: TrustfallColors.primary,
    borderRadius: 999,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '800',
    color: TrustfallColors.primaryForeground,
  },
  gridMeta: { paddingHorizontal: 2, gap: 2, paddingTop: 0 },
  gridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TrustfallColors.foreground,
    letterSpacing: -0.15,
    lineHeight: 15,
  },
  proName: { fontSize: 11, fontWeight: '600', color: TrustfallColors.muted },
  listCard: { padding: 0, overflow: 'hidden' },
  listCardColumn: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
  },
  listHeroPressableFill: {
    height: '100%',
  },
  listHeroBlockList: {
    width: '100%',
  },
  listImageRow: {
    position: 'relative',
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  listImageRowAspect: {
    aspectRatio: 3 / 2,
  },
  listImageRowFillSlot: {
    height: '100%',
  },
  listImage: { width: '100%', height: '100%' },
  tagAbs: { position: 'absolute', left: TrustfallSpacing.sm, top: TrustfallSpacing.sm },
  beforeThumb: {
    position: 'absolute',
    bottom: TrustfallSpacing.sm,
    right: TrustfallSpacing.sm,
    borderRadius: TrustfallRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TrustfallColors.border,
  },
  beforeImage: { width: '100%', height: '100%' },
  listPrice: {
    position: 'absolute',
    bottom: TrustfallSpacing.sm,
    left: TrustfallSpacing.sm,
    backgroundColor: TrustfallColors.primary,
    paddingHorizontal: TrustfallSpacing.sm,
    paddingVertical: 4,
    borderRadius: TrustfallRadius.md,
  },
  listBody: { paddingHorizontal: TrustfallSpacing.md, paddingVertical: TrustfallSpacing.sm, gap: 4 },
  listBodySlot: { flexShrink: 0, paddingVertical: TrustfallSpacing.xs },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TrustfallColors.foreground,
    letterSpacing: -0.25,
    lineHeight: 20,
  },
  metaLine: { fontSize: 12, color: TrustfallColors.muted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.xs },
  smallTag: {
    fontSize: 10,
    color: TrustfallColors.secondary,
    fontWeight: '500',
  },
})
