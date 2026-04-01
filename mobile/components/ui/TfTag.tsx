import { StyleSheet, Text, View } from 'react-native'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'

type TfTagProps = {
  label: string
}

export function TfTag({ label }: TfTagProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.xs,
    borderRadius: TrustfallRadius.md,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: 'rgba(23, 31, 51, 0.85)',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: TrustfallColors.foreground,
  },
})
