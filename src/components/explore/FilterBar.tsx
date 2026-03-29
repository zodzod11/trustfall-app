import type { ServiceCategory } from '../../types'
import { cn } from '../../utils/cn'

type FilterBarProps = {
  categories: ServiceCategory[]
  locations: string[]
  tags: string[]
  selectedCategory: ServiceCategory | 'all'
  selectedLocation: string
  selectedTag: string
  onCategoryChange: (next: ServiceCategory | 'all') => void
  onLocationChange: (next: string) => void
  onTagChange: (next: string) => void
}

const categoryLabel: Record<ServiceCategory, string> = {
  barber: 'Barber',
  hair: 'Hair',
  nails: 'Nails',
  makeup: 'Makeup',
}

export function FilterBar({
  categories,
  locations,
  tags,
  selectedCategory,
  selectedLocation,
  selectedTag,
  onCategoryChange,
  onLocationChange,
  onTagChange,
}: FilterBarProps) {
  return (
    <section className="tf-card space-y-4 p-4">
      <FilterRow
        label="Category"
        options={['all', ...categories]}
        selected={selectedCategory}
        onSelect={(value) => onCategoryChange(value as ServiceCategory | 'all')}
        renderLabel={(value) =>
          value === 'all' ? 'All' : categoryLabel[value as ServiceCategory]
        }
      />

      <FilterRow
        label="Location"
        options={['all', ...locations]}
        selected={selectedLocation}
        onSelect={onLocationChange}
        renderLabel={(value) => (value === 'all' ? 'All' : value)}
      />

      <FilterRow
        label="Tags"
        options={['all', ...tags]}
        selected={selectedTag}
        onSelect={onTagChange}
        renderLabel={(value) => (value === 'all' ? 'All' : value)}
      />
    </section>
  )
}

type FilterRowProps = {
  label: string
  options: string[]
  selected: string
  onSelect: (next: string) => void
  renderLabel: (value: string) => string
}

function FilterRow({
  label,
  options,
  selected,
  onSelect,
  renderLabel,
}: FilterRowProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {options.map((option) => {
          const isActive = selected === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={cn(
                'snap-start whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition',
                isActive
                  ? 'border-primary bg-primary/20 text-foreground'
                  : 'border-border bg-background text-muted hover:border-primary/50 hover:text-secondary',
              )}
            >
              {renderLabel(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
