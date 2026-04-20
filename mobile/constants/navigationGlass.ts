/**
 * Liquid Glass navigation — three test tiers. Content surfaces stay solid; glass is nav-only.
 */
export type NavigationGlassVariant = 'control' | 'light' | 'strong'

export const NAV_GLASS_DEFAULT: NavigationGlassVariant = 'control'

export const navigationGlassLabels: Record<NavigationGlassVariant, string> = {
  control: 'Control (baseline)',
  light: 'Light Liquid Glass',
  strong: 'Strong Liquid Glass',
}

/** Single outer shell — blur + tint + hairline (no nested frosted panels). */
export type LiquidGlassShellTokens = {
  blurIntensity: { ios: number; android: number }
  /** Multiply overlay darkness on top of blur (keeps labels readable). */
  overlay: string
  border: string
  borderRadius: number
  shadowOpacity: number
  shadowRadius: number
  /** Extra horizontal inset for floating header strip. */
  headerFloatInset: number
}

export function getLiquidGlassShellTokens(variant: NavigationGlassVariant): LiquidGlassShellTokens {
  switch (variant) {
    case 'control':
      return {
        blurIntensity: { ios: 56, android: 76 },
        overlay: 'rgba(11, 19, 38, 0.18)',
        border: 'rgba(255, 255, 255, 0.16)',
        borderRadius: 28,
        shadowOpacity: 0.35,
        shadowRadius: 20,
        headerFloatInset: 0,
      }
    case 'light':
      return {
        blurIntensity: { ios: 62, android: 82 },
        overlay: 'rgba(11, 19, 38, 0.20)',
        border: 'rgba(255, 255, 255, 0.18)',
        borderRadius: 30,
        shadowOpacity: 0.4,
        shadowRadius: 24,
        headerFloatInset: 16,
      }
    case 'strong':
      return {
        blurIntensity: { ios: 68, android: 86 },
        overlay: 'rgba(11, 19, 38, 0.16)',
        border: 'rgba(255, 255, 255, 0.20)',
        borderRadius: 30,
        shadowOpacity: 0.42,
        shadowRadius: 26,
        headerFloatInset: 16,
      }
  }
}

/** Bottom tab bar: Android tint under blur (not a second frosted layer). */
export function getTabBarAndroidTint(variant: NavigationGlassVariant): string {
  switch (variant) {
    case 'control':
      return 'rgba(11, 19, 38, 0.38)'
    case 'light':
      return 'rgba(11, 19, 38, 0.28)'
    case 'strong':
      return 'rgba(11, 19, 38, 0.24)'
  }
}

/** Active tab “luminous” pill — solid, not blurred (strong only). */
export const tabStrongLuminous = {
  background: 'rgba(47, 99, 230, 0.26)',
  border: 'rgba(255, 255, 255, 0.14)',
  width: 56,
  height: 34,
  borderRadius: 17,
} as const

/** Explore nav strip (strong): inner controls stay flat; shell is glass only. */
export function getExploreNavStripTokens(variant: NavigationGlassVariant): {
  useGlassStrip: boolean
} {
  return { useGlassStrip: variant === 'strong' }
}
