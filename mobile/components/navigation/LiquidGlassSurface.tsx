import { BlurView } from 'expo-blur'
import { type ReactNode } from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'
import type { NavigationGlassVariant } from '@/constants/navigationGlass'
import { getLiquidGlassShellTokens } from '@/constants/navigationGlass'

type Props = {
  children: ReactNode
  variant: NavigationGlassVariant
  style?: ViewStyle
  contentStyle?: ViewStyle
}

/**
 * One frosted shell: blur + dark veil + soft border. Use for nav chrome only — not cards/lists.
 */
export function LiquidGlassSurface({ children, variant, style, contentStyle }: Props) {
  const t = getLiquidGlassShellTokens(variant)
  const intensity = Platform.OS === 'ios' ? t.blurIntensity.ios : t.blurIntensity.android

  return (
    <View
      style={[
        {
          borderRadius: t.borderRadius,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: t.border,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: t.shadowOpacity,
              shadowRadius: t.shadowRadius,
            },
            android: { elevation: 20 },
            default: {},
          }),
        },
        style,
      ]}
    >
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFillObject, styles.webGlass]} pointerEvents="none" />
      ) : (
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFillObject} pointerEvents="none" />
      )}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.overlay }]} pointerEvents="none" />
      <View style={[{ position: 'relative', zIndex: 1 }, contentStyle]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  /** Brighter than before so content shows through; pair with lighter overlay in tokens. */
  webGlass: {
    backgroundColor: 'rgba(22, 32, 58, 0.52)',
    backdropFilter: 'blur(24px)' as never,
  },
})
