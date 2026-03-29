import { useMemo, useState } from 'react'
import { FilterBar } from '../components/explore/FilterBar'
import { PortfolioCard } from '../components/explore/PortfolioCard'
import { PageHeader } from '../components/layout/PageHeader'
import { professionalsSeed } from '../data/seed'
import type { ServiceCategory } from '../types'

export function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>(
    'all',
  )
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedTag, setSelectedTag] = useState('all')

  const portfolioFeed = useMemo(
    () =>
      professionalsSeed.flatMap((professional) =>
        professional.portfolioItems.map((item) => ({
          ...item,
          professionalName: professional.displayName,
          professionalTitle: professional.title,
          location: professional.city,
        })),
      ),
    [],
  )

  const categories = useMemo(
    () =>
      Array.from(
        new Set(portfolioFeed.map((item) => item.category)),
      ) as ServiceCategory[],
    [portfolioFeed],
  )

  const locations = useMemo(
    () => Array.from(new Set(portfolioFeed.map((item) => item.location))).sort(),
    [portfolioFeed],
  )

  const tags = useMemo(
    () => Array.from(new Set(portfolioFeed.flatMap((item) => item.tags))).sort(),
    [portfolioFeed],
  )

  const filteredItems = useMemo(
    () =>
      portfolioFeed.filter((item) => {
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false
        }
        if (selectedLocation !== 'all' && item.location !== selectedLocation) {
          return false
        }
        if (selectedTag !== 'all' && !item.tags.includes(selectedTag)) {
          return false
        }
        return true
      }),
    [portfolioFeed, selectedCategory, selectedLocation, selectedTag],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Near you"
        title="Explore"
        description="Browse premium transformations with fast filters for category, location, and style tags."
      />

      <p className="text-xs font-medium text-muted">
        {filteredItems.length} result{filteredItems.length === 1 ? '' : 's'} available
      </p>

      <FilterBar
        categories={categories}
        locations={locations}
        tags={tags}
        selectedCategory={selectedCategory}
        selectedLocation={selectedLocation}
        selectedTag={selectedTag}
        onCategoryChange={setSelectedCategory}
        onLocationChange={setSelectedLocation}
        onTagChange={setSelectedTag}
      />

      <div className="grid grid-cols-1 gap-5">
        {filteredItems.map((item) => (
          <PortfolioCard key={item.id} item={item} />
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          category={selectedCategory}
          location={selectedLocation}
          tag={selectedTag}
        />
      ) : null}
    </div>
  )
}

type EmptyStateProps = {
  category: ServiceCategory | 'all'
  location: string
  tag: string
}

function EmptyState({ category, location, tag }: EmptyStateProps) {
  return (
    <div className="tf-card px-5 py-8 text-center">
      <p className="text-base font-semibold text-secondary">
        No portfolio matches these filters yet.
      </p>
      <p className="mt-1 text-xs text-muted">
        Category: {category} · Location: {location} · Tag: {tag}
      </p>
      <p className="mt-3 text-xs text-muted/90">
        Try broadening one filter to see more premium looks.
      </p>
    </div>
  )
}
