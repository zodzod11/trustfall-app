import { professionalsSeed } from '@/data/seed'
import type { RequestSubmission } from '@/types'
import { buildPortfolioFeed } from '@/lib/buildPortfolioFeed'
import { onboardingApi } from '@/lib/onboarding'
import { formatPhoneNumber } from '@/lib/phone'
import { supabase } from '@/lib/supabase'
import type { ContactPreference } from '../../src/services/onboarding/types'

export const PREFERENCE_CATEGORY_OPTIONS = ['hair', 'barber', 'nails', 'makeup', 'tattoo', 'brows'] as const

export function getActivityPreferenceCategories(input: {
  savedPortfolioItemIds: string[]
  savedProfessionalIds: string[]
  requestSubmissions: RequestSubmission[]
}): string[] {
  const portfolioFeed = buildPortfolioFeed()
  const fromSavedLooks = input.savedPortfolioItemIds
    .map((id) => portfolioFeed.find((item) => item.id === id)?.category)
    .filter((value): value is string => Boolean(value))

  const fromSavedPros = input.savedProfessionalIds
    .map((id) => professionalsSeed.find((pro) => pro.id === id)?.category)
    .filter((value): value is string => Boolean(value))

  const fromRequests = input.requestSubmissions
    .map((submission) => portfolioFeed.find((item) => item.id === submission.portfolioItemId)?.category)
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set([...fromSavedLooks, ...fromSavedPros, ...fromRequests]))
}

export async function saveOnboardingPreferenceCategories(categories: string[]) {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr) return { error: authErr.message }
  if (!authData.user) return { error: 'Sign in to update your preferences.' }

  const uid = authData.user.id
  const cleanedCategories = Array.from(
    new Set(categories.map((value) => value.trim().toLowerCase()).filter(Boolean)),
  )

  const { data: existingPrefs, error: prefsReadErr } = await supabase
    .from('user_preferences')
    .select('user_id')
    .eq('user_id', uid)
    .maybeSingle()

  if (prefsReadErr) return { error: prefsReadErr.message }

  const prefsWrite = existingPrefs
    ? supabase
        .from('user_preferences')
        .update({ preferred_categories: cleanedCategories })
        .eq('user_id', uid)
    : supabase
        .from('user_preferences')
        .insert({ user_id: uid, preferred_categories: cleanedCategories, extra: {} })

  const { error } = await prefsWrite
  return { error: error?.message ?? null }
}

export async function saveOnboardingPreferences(input: {
  firstName: string
  categories: string[]
  styleTags: string[]
  inspirationFileName: string
  location: string
  contactPreference: ContactPreference | null
  email: string
  phone: string
}): Promise<{ error: string | null }> {
  const result = await onboardingApi.saveOnboardingProgress({
    firstName: input.firstName.trim(),
    categories: Array.from(new Set(input.categories.map((value) => value.trim().toLowerCase()).filter(Boolean))),
    styleTags: Array.from(new Set(input.styleTags.map((value) => value.trim().toLowerCase()).filter(Boolean))),
    inspirationFileName: input.inspirationFileName.trim() || null,
    location: input.location.trim(),
    contactPreference: input.contactPreference,
    email: input.email.trim(),
    phone: formatPhoneNumber(input.phone),
  })

  return { error: result.error?.message ?? null }
}

export async function savePersonalBudgetRange(input: {
  budgetMin: string
  budgetMax: string
}): Promise<{ error: string | null }> {
  const budgetMin = input.budgetMin.trim()
  const budgetMax = input.budgetMax.trim()
  const min = budgetMin ? Number(budgetMin) : NaN
  const max = budgetMax ? Number(budgetMax) : NaN

  if (budgetMin && !Number.isFinite(min)) return { error: 'Minimum budget must be a valid number.' }
  if (budgetMax && !Number.isFinite(max)) return { error: 'Maximum budget must be a valid number.' }
  if (budgetMin && budgetMax && min > max) {
    return { error: 'Minimum budget cannot be greater than maximum budget.' }
  }

  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr) return { error: authErr.message }
  if (!authData.user) return { error: 'Sign in to update your preferences.' }

  const { error } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    budget_min: budgetMin || null,
    budget_max: budgetMax || null,
  })

  return { error: error?.message ?? null }
}
