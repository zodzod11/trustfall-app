import { deriveOnboardingState } from '../services/onboarding/extra'
import type { ClientProfileRow, UserPreferencesRow } from '../services/onboarding/types'
import type { ServiceCategory } from '../types'
import {
  emptyOnboardingDraft,
  type OnboardingFormValues,
  type PersistedOnboardingSnapshot,
} from './types'

/** Convert server read model → local draft for binding / resume. */
export function serverSnapshotToDraft(server: PersistedOnboardingSnapshot): OnboardingFormValues {
  return {
    firstName: server.firstName,
    categories: (server.categories ?? []) as ServiceCategory[],
    styleTags: [...(server.styleTags ?? [])],
    inspirationFileName: server.inspirationFileName ?? '',
    location: server.location,
    contactPreference: server.contactPreference,
    email: server.email ?? '',
    phone: server.phone ?? '',
    password: '',
  }
}

/** Merge hydrate into empty draft (explicit empty base for clarity). */
export function buildDraftFromServer(server: PersistedOnboardingSnapshot | null): OnboardingFormValues {
  if (!server) return emptyOnboardingDraft()
  return serverSnapshotToDraft(server)
}

/** After save/upsert, rebuild the same snapshot shape as `getOnboardingState`. */
export function rowsToPersistedSnapshot(
  profile: ClientProfileRow | null,
  preferences: UserPreferencesRow | null,
  authEmail: string | null = null,
): PersistedOnboardingSnapshot {
  const derived = deriveOnboardingState(profile, preferences, authEmail)
  return {
    profile,
    preferences,
    ...derived,
  }
}
