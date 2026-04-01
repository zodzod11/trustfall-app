/**
 * Example usage for user-side services (not executed by the app).
 *
 * ```ts
 * import {
 *   createContactRequest,
 *   createMatchRequest,
 *   listMyMatchRequests,
 *   listMySavedPortfolios,
 *   saveUserPreferences,
 *   updateMatchRequestImagePaths,
 * } from '@/services/user'
 * ```
 */

import {
  createContactRequest,
  createMatchRequest,
  listMyMatchRequests,
  listMySavedPortfolios,
  saveUserPreferences,
  updateMatchRequestImagePaths,
} from './index'

export async function exampleSavePrefsAfterOnboarding() {
  const res = await saveUserPreferences({
    onboarding_completed_at: new Date().toISOString(),
    preferred_categories: ['hair', 'makeup'],
    extra: { styleTags: ['natural', 'soft glam'] },
  })
  return res
}

export async function exampleCreateMatchAndAttachPaths() {
  const created = await createMatchRequest({
    category: 'hair',
    location_text: 'Houston',
    tags: ['layers', 'volume'],
    vision_notes: 'Face-framing layers',
  })
  if (created.error) return created

  const paths = await updateMatchRequestImagePaths(created.data.id, {
    inspiration_image_path: 'client-uploads/uuid/match-requests/' + created.data.id + '/inspiration.jpg',
    current_photo_path: 'client-uploads/uuid/match-requests/' + created.data.id + '/current.jpg',
  })
  return paths
}

export async function exampleListHistory() {
  return listMyMatchRequests({ limit: 20, status: 'submitted' })
}

export async function exampleSavedFeed() {
  return listMySavedPortfolios()
}

export async function exampleContactPro() {
  return createContactRequest({
    professional_id: '00000000-0000-4000-8000-000000000001',
    portfolio_item_id: '00000000-0000-4000-8000-000000000002',
    message: 'Hi — are you taking new clients this month?',
    client_name: 'Alex',
    client_email: 'alex@example.com',
  })
}
