/**
 * Example usage for Trustfall onboarding services (not run by the app).
 * Wire `createOnboardingApi` to your Supabase client at bootstrap.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnboardingApi } from './onboardingApi'

/**
 * Web (Vite): `import { createClient } from '@/lib/client'` — same `SupabaseClient` as SSR helpers elsewhere.
 */
export async function exampleWebOnboarding(client: SupabaseClient) {
  const onboarding = createOnboardingApi(client)

  const state = await onboarding.getOnboardingState()
  if (state.error) {
    console.error(state.error.message)
    return
  }
  if (state.data?.isComplete) {
    return
  }

  await onboarding.saveOnboardingProgress({
    firstName: 'Alex',
    categories: ['barber', 'hair'],
    styleTags: ['clean'],
    location: 'Austin',
  })

  const done = await onboarding.completeOnboarding({
    firstName: 'Alex',
    categories: ['barber'],
    styleTags: ['clean'],
    inspirationFileName: 'ref.jpg',
    location: 'Austin',
    contactPreference: 'text',
  })
  if (done.error) {
    console.error(done.error.message)
  }
}
