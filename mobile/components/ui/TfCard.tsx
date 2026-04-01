import { StyleSheet, View, type ViewProps } from 'react-native'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'

export function TfCard({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: TrustfallColors.surface,
    borderRadius: TrustfallRadius.xl,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    padding: TrustfallSpacing.lg,
  },
})
