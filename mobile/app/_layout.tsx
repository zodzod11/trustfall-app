import { ThemeProvider } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Platform, StyleSheet, View } from 'react-native'
import 'react-native-reanimated'
import { TrustfallNavigationTheme } from '@/constants/navigation-theme'
import { TrustfallColors } from '@/constants/trustfall-theme'
import { MatchDraftProvider } from '@/contexts/MatchDraftContext'
import { SavedProvider } from '@/contexts/SavedProvider'

export default function RootLayout() {
  return (
    <View style={styles.shell}>
      <SavedProvider>
        <MatchDraftProvider>
          <ThemeProvider value={TrustfallNavigationTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="welcome" />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="sign-up" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="settings"
                options={{
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="pro/[id]"
                options={{
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </MatchDraftProvider>
      </SavedProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: TrustfallColors.background,
    ...Platform.select({
      web: { minHeight: '100vh' as never, height: '100%' as never },
      default: {},
    }),
  },
})

