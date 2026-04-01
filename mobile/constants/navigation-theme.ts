import { DarkTheme, type Theme } from '@react-navigation/native'
import { TrustfallColors } from '@/constants/trustfall-theme'

export const TrustfallNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: TrustfallColors.primary,
    background: TrustfallColors.background,
    card: TrustfallColors.surface,
    text: TrustfallColors.foreground,
    border: TrustfallColors.border,
    notification: TrustfallColors.accent,
  },
}
