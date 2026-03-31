import { useMemo, useState } from 'react'
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
  const [isOpen, setIsOpen] = useState(false)

  const summary = useMemo(() => {
    const parts: string[] = []
    if (selectedCategory !== 'all') {
      parts.push(categoryLabel[selectedCategory as ServiceCategory])
    }
    if (selectedLocation !== 'all') {
      parts.push(selectedLocation)
    }
    if (selectedTag !== 'all') {
      parts.push(selectedTag)
    }
    return parts.length > 0 ? parts.join(' · ') : 'All styles, locations, tags'
  }, [selectedCategory, selectedLocation, selectedTag])

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="tf-card flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/85">
            Filters
          </p>
          <p className="truncate text-xs text-secondary">{summary}</p>
        </div>
        <span
          className={cn(
            'text-sm text-muted transition-transform',
            isOpen ? 'rotate-180' : 'rotate-0',
          )}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {isOpen ? (
        <div className="tf-card space-y-4 p-4">
          <FilterRow
            label="Style"
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
        </div>
      ) : null}
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
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/85">{label}</p>
      <div className="tf-no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {options.map((option) => {
          const isActive = selected === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={cn(
                'whitespace-nowrap rounded-xl border px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] transition',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-[0_10px_28px_-8px_rgba(47,99,230,0.75)]'
                  : 'border-border bg-surface-elevated text-muted hover:border-primary/50 hover:text-secondary',
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
