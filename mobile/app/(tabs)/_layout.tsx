import { Tabs } from 'expo-router'
import React from 'react'
import { HapticTab } from '@/components/haptic-tab'
import { TrustfallTabBar } from '@/components/layout/TrustfallTabBar'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { TrustfallColors } from '@/constants/trustfall-theme'

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TrustfallTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: TrustfallColors.primary,
        tabBarInactiveTintColor: 'rgba(196, 197, 217, 0.5)',
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 0,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 24 : 22} name="sparkles" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          title: 'Match',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 24 : 22} name="wand.and.stars" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 24 : 22} name="bookmark.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 24 : 22} name="person.crop.circle" color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
