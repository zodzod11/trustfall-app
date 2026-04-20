import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'

const OAUTH_SCHEME = 'trustfall'

export async function signInWithOAuthGoogle(redirectUrl: string) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })
}

export function buildOAuthRedirectUrl(path: string) {
  return Linking.createURL(path, { scheme: OAUTH_SCHEME })
}

export async function setSessionFromOAuthTokens(accessToken: string, refreshToken: string) {
  return supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
}

export function parseOAuthCallbackTokens(callbackUrl: string): {
  accessToken: string | null
  refreshToken: string | null
  errorDescription: string | null
} {
  const hash = callbackUrl.split('#')[1] ?? ''
  const query = callbackUrl.split('?')[1] ?? ''
  const params = new URLSearchParams(hash || query)

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    errorDescription: params.get('error_description') ?? params.get('error'),
  }
}
