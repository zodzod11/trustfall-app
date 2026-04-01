import type { ServiceCategory } from '../types'

/** Shared option lists for web + mobile onboarding UIs. */
export const ONBOARDING_CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'barber', label: 'Barber' },
  { value: 'hair', label: 'Hair' },
  { value: 'nails', label: 'Nails' },
  { value: 'makeup', label: 'Makeup' },
]

export const ONBOARDING_STYLE_TAG_OPTIONS = [
  'clean',
  'soft-glam',
  'editorial',
  'classic',
  'natural',
  'bold',
  'chrome',
  'bridal',
] as const
