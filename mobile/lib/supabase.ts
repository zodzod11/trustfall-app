import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

type ExpoExtra = {
  supabaseUrl?: string
  supabaseKey?: string
}

function readExtra(): ExpoExtra {
  const fromExpo = Constants.expoConfig?.extra as ExpoExtra | undefined
  const fromManifest = (Constants as { manifest?: { extra?: ExpoExtra } }).manifest?.extra
  return { ...fromManifest, ...fromExpo }
}

/** Prefer Metro-inlined `EXPO_PUBLIC_*` (reliable on web); fall back to `app.config.js` `extra`. */
function resolveUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
  if (fromEnv) return fromEnv
  return readExtra().supabaseUrl?.trim() ?? ''
}

function resolveKey(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()
  if (fromEnv) return fromEnv
  return readExtra().supabaseKey?.trim() ?? ''
}

const resolvedUrl = resolveUrl()
const resolvedKey = resolveKey()

/**
 * True when real project URL + key are set. If false, the client uses placeholders so the app can boot
 * without `EXPO_PUBLIC_*` (explore falls back to seed data; API calls hit an invalid host until configured).
 */
export const isSupabaseConfigured = Boolean(resolvedUrl && resolvedKey)

/** Valid-shaped values so `createClient` never receives empty strings (throws `supabaseUrl is required`). */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const url = isSupabaseConfigured ? resolvedUrl : PLACEHOLDER_URL
const key = isSupabaseConfigured ? resolvedKey : PLACEHOLDER_KEY

/**
 * Supabase client for React Native (AsyncStorage session).
 * Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (or `expo.extra` in app config).
 */
export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
