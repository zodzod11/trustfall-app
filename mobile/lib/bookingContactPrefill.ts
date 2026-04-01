import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/database/rows'

export type BookingContactPrefill = {
  clientName: string
  clientEmail: string
  clientPhone: string
  /** `session` when a Supabase user was found; `none` when signed out. */
  source: 'session' | 'none'
}

/**
 * Name / email / phone for booking requests — from `profiles`, Auth, and onboarding `extra.contact_email`.
 */
export async function fetchBookingContactPrefill(): Promise<BookingContactPrefill> {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData.user) {
    return { clientName: '', clientEmail: '', clientPhone: '', source: 'none' }
  }

  const user = authData.user
  const uid = user.id

  const [profileRes, prefsRes] = await Promise.all([
    supabase.from('profiles').select('display_name, phone').eq('id', uid).maybeSingle(),
    supabase.from('user_preferences').select('extra').eq('user_id', uid).maybeSingle(),
  ])

  const profile = profileRes.data as Pick<ProfileRow, 'display_name' | 'phone'> | null
  const rawExtra = prefsRes.data?.extra
  const extraObj =
    rawExtra && typeof rawExtra === 'object' && !Array.isArray(rawExtra)
      ? (rawExtra as Record<string, unknown>)
      : {}
  const contactEmailExtra =
    typeof extraObj.contact_email === 'string' ? extraObj.contact_email.trim() : ''

  const email = (user.email?.trim() || contactEmailExtra) || ''

  const meta = user.user_metadata as Record<string, unknown> | undefined
  const metaFull =
    typeof meta?.full_name === 'string'
      ? meta.full_name.trim()
      : typeof meta?.name === 'string'
        ? meta.name.trim()
        : ''

  const displayName = profile?.display_name?.trim()
  const clientName =
    displayName || metaFull || (email ? email.split('@')[0] : '') || ''

  return {
    clientName,
    clientEmail: email,
    clientPhone: profile?.phone?.trim() ?? '',
    source: 'session',
  }
}
