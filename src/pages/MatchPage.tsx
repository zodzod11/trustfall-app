import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import type { MatchRequestDraft, ServiceCategory } from '../types'
import { cn } from '../utils/cn'

const CATEGORY_OPTIONS: { label: string; value: ServiceCategory }[] = [
  { label: 'Barber', value: 'barber' },
  { label: 'Hair', value: 'hair' },
  { label: 'Nails', value: 'nails' },
  { label: 'Makeup', value: 'makeup' },
]

const TAG_OPTIONS = [
  'clean',
  'natural',
  'bold',
  'soft-glam',
  'editorial',
  'bridal',
  'chrome',
  'fade',
] as const

export function MatchPage() {
  const navigate = useNavigate()
  const [request, setRequest] = useState<MatchRequestDraft>({
    imageName: '',
    notes: '',
    tags: [],
    category: '',
    location: '',
  })

  const canSubmit =
    request.category.length > 0 &&
    request.location.trim().length > 0 &&
    (request.notes.trim().length > 0 ||
      request.tags.length > 0 ||
      request.imageName.length > 0)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setRequest((current) => ({ ...current, imageName: file?.name ?? '' }))
  }

  function toggleTag(tag: string) {
    setRequest((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((t) => t !== tag)
        : [...current.tags, tag],
    }))
  }

  function submitRequest() {
    if (!canSubmit) return
    navigate('/match/results', {
      state: { request },
    })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Get Matched"
        title="Get matched"
        description="Share your look goal and we will rank professionals around your preferences."
      />

      <div className="tf-card space-y-5 p-4 sm:p-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-secondary">
            Inspiration image
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="tf-input file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
          />
          {request.imageName ? (
            <p className="text-xs text-secondary">Uploaded: {request.imageName}</p>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-secondary">Describe your look</span>
          <textarea
            rows={4}
            value={request.notes}
            onChange={(event) =>
              setRequest((current) => ({ ...current, notes: event.target.value }))
            }
            className="tf-input resize-none"
            placeholder="Tell us your vibe, event, budget feel, or reference details."
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium text-secondary">Style tags</span>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition',
                  request.tags.includes(tag)
                    ? 'border-primary bg-primary/20 text-foreground'
                    : 'border-border bg-background text-muted hover:border-primary/60 hover:text-secondary',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-secondary">Category</span>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setRequest((current) => ({ ...current, category: option.value }))
                }
                className={cn(
                  'rounded-xl border px-3 py-3 text-sm font-medium transition',
                  request.category === option.value
                    ? 'border-primary bg-primary/20 text-foreground'
                    : 'border-border bg-background text-muted hover:border-primary/60',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-secondary">Location</span>
          <input
            type="text"
            value={request.location}
            onChange={(event) =>
              setRequest((current) => ({ ...current, location: event.target.value }))
            }
            placeholder="Enter city or neighborhood"
            className="tf-input"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={submitRequest}
        disabled={!canSubmit}
        className={cn(
          'tf-button-primary flex w-full',
          !canSubmit && 'pointer-events-none opacity-50',
        )}
      >
        Find Matches
      </button>
      {!canSubmit ? (
        <p className="text-center text-xs text-muted">
          Add category + location and at least one detail to continue.
        </p>
      ) : null}
    </div>
  )
}
