/**
 * Mobile entry for the shared onboarding API — same Supabase client as other user services.
 */
import { createOnboardingApi } from '../../src/services/onboarding'
import { supabase } from './supabase'

export const onboardingApi = createOnboardingApi(supabase)
