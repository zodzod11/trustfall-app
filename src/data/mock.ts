import type { ExploreCard, MatchResultItem } from '../types'

export const exploreCards: ExploreCard[] = [
  {
    id: 'aurora',
    title: 'Aurora Ridge',
    subtitle: 'Weekend escapes · 12 curated spots',
    imageGradient: 'from-primary/55 via-accent/35 to-secondary/25',
    tag: 'Trending',
  },
  {
    id: 'ember',
    title: 'Ember District',
    subtitle: 'Food & live music · Updated today',
    imageGradient: 'from-primary/45 via-secondary/25 to-background/70',
    tag: 'New',
  },
  {
    id: 'tide',
    title: 'Tideline Walk',
    subtitle: 'Waterfront · Golden hour picks',
    imageGradient: 'from-secondary/45 via-primary/35 to-background/65',
    tag: 'Scenic',
  },
  {
    id: 'nocturne',
    title: 'Nocturne Alley',
    subtitle: 'Late-night · Low-light friendly',
    imageGradient: 'from-background via-primary/35 to-surface-elevated',
    tag: 'Night',
  },
]

export const exploreDetailCopy: Record<
  string,
  { headline: string; body: string; highlights: string[] }
> = {
  aurora: {
    headline: 'Soft light, sharp taste',
    body: 'Curated for slow evenings and confident first impressions. Mock copy only — swap in real venue data later.',
    highlights: ['Indoor / outdoor mix', 'Reservation-friendly', 'Photo-forward'],
  },
  ember: {
    headline: 'Warm energy, crisp edges',
    body: 'Placeholder narrative for Ember District. This screen proves typography, spacing, and scroll behavior.',
    highlights: ['Live sets Thu–Sat', 'Chef’s counter', 'Shareable plates'],
  },
  tide: {
    headline: 'Salt air, steady pace',
    body: 'Tideline Walk is a mock collection for testing deep links and back navigation from Explore.',
    highlights: ['Sunset window', 'Walkable loop', 'Quiet corners'],
  },
  nocturne: {
    headline: 'After dark, on purpose',
    body: 'Nocturne Alley uses moody gradients to validate your visual hierarchy on OLED displays.',
    highlights: ['Low noise floors', 'Cocktail-first', 'Easy exits'],
  },
}

export const defaultExploreDetail = {
  headline: 'Discover something new',
  body: 'This is placeholder content for an ID that is not in the mock catalog.',
  highlights: ['Add API data', 'Wire images', 'Hook analytics'],
}

export const matchResultsMock: MatchResultItem[] = [
  {
    id: 'm1',
    name: 'River & Co.',
    scoreLabel: '94% fit',
    blurb: 'Balanced pace, shared taste in venues with natural light.',
  },
  {
    id: 'm2',
    name: 'Studio North',
    scoreLabel: '89% fit',
    blurb: 'Loves galleries, early dinners, and crisp typography.',
  },
  {
    id: 'm3',
    name: 'Harborline',
    scoreLabel: '86% fit',
    blurb: 'Waterfront walks, playlists with saxophone, low-key plans.',
  },
]

export const savedSlugs = ['aurora', 'tide'] as const
