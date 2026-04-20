import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  NAV_GLASS_DEFAULT,
  type NavigationGlassVariant,
  navigationGlassLabels,
} from '@/constants/navigationGlass'
import { STORAGE_NAV_GLASS_VARIANT_V1 } from '@/constants/storage-keys'

type Ctx = {
  variant: NavigationGlassVariant
  setVariant: (v: NavigationGlassVariant) => void
  cycleVariant: () => void
  labels: typeof navigationGlassLabels
}

const NavigationGlassContext = createContext<Ctx | null>(null)

export function NavigationGlassProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] = useState<NavigationGlassVariant>(NAV_GLASS_DEFAULT)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_NAV_GLASS_VARIANT_V1).then((raw) => {
      if (raw === 'control' || raw === 'light' || raw === 'strong') {
        setVariantState(raw)
      }
      setReady(true)
    })
  }, [])

  const setVariant = useCallback((v: NavigationGlassVariant) => {
    setVariantState(v)
    void AsyncStorage.setItem(STORAGE_NAV_GLASS_VARIANT_V1, v)
  }, [])

  const cycleVariant = useCallback(() => {
    setVariantState((cur) => {
      const order: NavigationGlassVariant[] = ['control', 'light', 'strong']
      const i = order.indexOf(cur)
      const next = order[(i + 1) % order.length]
      void AsyncStorage.setItem(STORAGE_NAV_GLASS_VARIANT_V1, next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      variant: ready ? variant : NAV_GLASS_DEFAULT,
      setVariant,
      cycleVariant,
      labels: navigationGlassLabels,
    }),
    [variant, ready, setVariant, cycleVariant],
  )

  return <NavigationGlassContext.Provider value={value}>{children}</NavigationGlassContext.Provider>
}

export function useNavigationGlass(): Ctx {
  const ctx = useContext(NavigationGlassContext)
  if (!ctx) {
    throw new Error('useNavigationGlass must be used within NavigationGlassProvider')
  }
  return ctx
}

/** Safe for screens that might render outside provider (tests) — returns baseline. */
export function useNavigationGlassOptional(): Ctx {
  const ctx = useContext(NavigationGlassContext)
  return (
    ctx ?? {
      variant: NAV_GLASS_DEFAULT,
      setVariant: () => {},
      cycleVariant: () => {},
      labels: navigationGlassLabels,
    }
  )
}
