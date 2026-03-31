import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { professionalsSeed, usersSeed } from '../data/seed'
import { useSaved } from '../hooks/useSaved'
import type { MatchRequestDraft } from '../types'
import { cn } from '../utils/cn'
import { persistMatchUploadSession } from '../utils/matchUploadSession'

const TOTAL_STEPS = 4

const TAG_OPTIONS = [
  'bold',
  'natural',
  'soft glam',
  'clean',
  'editorial',
  'classic',
  'trendy',
] as const

const VISION_SUGGESTIONS = [
  'Low taper fade with texture',
  'Soft glam makeup',
  '90s aesthetic blowout',
  'Minimalist nail art',
] as const

const CATEGORY_VISION_SUGGESTIONS: Partial<
  Record<MatchRequestDraft['category'], readonly string[]>
> = {
  hair: [
    'Face-framing layers with volume',
    '90s aesthetic blowout',
    'Natural silk press with body',
    'Low-maintenance balayage refresh',
  ],
  nails: [
    'Minimalist nail art',
    'Milky white structured gel set',
    'Chrome french almond shape',
    'Short square clean-girl manicure',
  ],
  tattoo: [
    'Fine-line minimalist forearm design',
    'Micro realism floral tattoo',
    'Black and grey script concept',
    'Geometric sleeve starter concept',
  ],
  barber: [
    'Low taper fade with texture',
    'Burst fade + beard lineup',
    'Classic taper with natural top',
    'Crisp edge-up and shape-up',
  ],
  makeup: [
    'Soft glam makeup',
    'No-makeup makeup with dewy skin',
    'Full-glam event beat with lashes',
    'Bridal trial natural glow',
  ],
  brows: [
    'Natural brow shaping and tint',
    'Soft ombre brow look',
    'Laminated fluffy brow style',
    'Clean arch + subtle fill',
  ],
}

const STEP_ONE_CATEGORY_OPTIONS: {
  label: string
  value: MatchRequestDraft['category']
}[] = [
  { label: 'Hair', value: 'hair' },
  { label: 'Nails', value: 'nails' },
  { label: 'Tattoo', value: 'tattoo' },
]

function getCameraCaptureMode(category: MatchRequestDraft['category']) {
  if (category === 'hair') return 'user'
  if (category === 'nails' || category === 'tattoo') return 'environment'
  // Default to front camera when category is unset or face-focused.
  return 'user'
}

function getContextualVisionSuggestions(
  category: MatchRequestDraft['category'],
  preferredCategories: readonly string[],
) {
  const categorySuggestions = category
    ? (CATEGORY_VISION_SUGGESTIONS[category] ?? [])
    : []
  const preferenceSuggestions = preferredCategories.flatMap(
    (preferred) => CATEGORY_VISION_SUGGESTIONS[preferred as MatchRequestDraft['category']] ?? [],
  )

  const merged = [
    ...categorySuggestions,
    ...preferenceSuggestions,
    ...VISION_SUGGESTIONS,
  ]

  return [...new Set(merged)].slice(0, 4)
}

export function MatchPage() {
  const navigate = useNavigate()
  const activeUser = usersSeed[0]
  const { savedPortfolioItemIds } = useSaved()
  const [step, setStep] = useState(0)
  const [isSavedLooksOpen, setIsSavedLooksOpen] = useState(false)
  const [selectedSavedLookId, setSelectedSavedLookId] = useState('')
  const [request, setRequest] = useState<MatchRequestDraft>({
    imageName: '',
    currentPhotoName: '',
    notes: '',
    tags: [],
    category: '',
    location: '',
  })
  const inspirationFileRef = useRef<File | null>(null)
  const currentPhotoFileRef = useRef<File | null>(null)
  const inspirationBlobUrlRef = useRef<string | null>(null)
  const currentPhotoBlobUrlRef = useRef<string | null>(null)
  const [inspirationPreviewSrc, setInspirationPreviewSrc] = useState<string | null>(
    null,
  )
  const [currentPhotoPreviewSrc, setCurrentPhotoPreviewSrc] = useState<string | null>(
    null,
  )

  useEffect(() => {
    return () => {
      if (inspirationBlobUrlRef.current) {
        URL.revokeObjectURL(inspirationBlobUrlRef.current)
      }
      if (currentPhotoBlobUrlRef.current) {
        URL.revokeObjectURL(currentPhotoBlobUrlRef.current)
      }
    }
  }, [])

  const hasVisionInput =
    request.notes.trim().length > 0 ||
    request.imageName.length > 0 ||
    Boolean(request.currentPhotoName)
  const step0Valid = request.category.length > 0
  const step1Valid = hasVisionInput
  const step2Valid = request.location.trim().length > 0
  const canSubmit = step0Valid && step1Valid && step2Valid
  const cameraCaptureMode = getCameraCaptureMode(request.category)
  const visionSuggestions = useMemo(
    () =>
      getContextualVisionSuggestions(
        request.category,
        activeUser?.preferredCategories ?? [],
      ),
    [request.category, activeUser],
  )
  const savedLooks = useMemo(() => {
    const portfolioFeed = professionalsSeed.flatMap((pro) =>
      pro.portfolioItems.map((item) => ({
        id: item.id,
        serviceTitle: item.serviceTitle,
        category: item.category,
        tags: item.tags,
        imageUrl: item.afterImageUrl,
        professionalName: pro.displayName,
      })),
    )

    return savedPortfolioItemIds
      .map((id) => portfolioFeed.find((item) => item.id === id))
      .filter((item): item is (typeof portfolioFeed)[number] => Boolean(item))
  }, [savedPortfolioItemIds])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    inspirationFileRef.current = file
    setSelectedSavedLookId('')

    if (inspirationBlobUrlRef.current) {
      URL.revokeObjectURL(inspirationBlobUrlRef.current)
      inspirationBlobUrlRef.current = null
    }

    if (file) {
      const url = URL.createObjectURL(file)
      inspirationBlobUrlRef.current = url
      setInspirationPreviewSrc(url)
    } else {
      setInspirationPreviewSrc(null)
    }

    setRequest((current) => ({ ...current, imageName: file?.name ?? '' }))
  }

  function handleCurrentPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    currentPhotoFileRef.current = file

    if (currentPhotoBlobUrlRef.current) {
      URL.revokeObjectURL(currentPhotoBlobUrlRef.current)
      currentPhotoBlobUrlRef.current = null
    }

    if (file) {
      const url = URL.createObjectURL(file)
      currentPhotoBlobUrlRef.current = url
      setCurrentPhotoPreviewSrc(url)
    } else {
      setCurrentPhotoPreviewSrc(null)
    }

    setRequest((current) => ({ ...current, currentPhotoName: file?.name ?? '' }))
  }

  function buildSavedLookDescription(look: {
    serviceTitle: string
    category: string
    professionalName: string
    tags: string[]
  }) {
    const tagLine = look.tags.length > 0 ? look.tags.slice(0, 3).join(', ') : 'inspired style'
    return `I want a look similar to "${look.serviceTitle}" by ${look.professionalName}. Category: ${look.category}. Key style details: ${tagLine}.`
  }

  function toggleTag(tag: string) {
    setRequest((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((t) => t !== tag)
        : [...current.tags, tag],
    }))
  }

  async function submitRequest() {
    if (!canSubmit) return
    await persistMatchUploadSession(
      inspirationFileRef.current,
      currentPhotoFileRef.current,
    )
    navigate('/match/results', {
      state: { request },
    })
  }

  function nextStep() {
    if (step === 0 && !step0Valid) return
    if (step === 1 && !step1Valid) return
    if (step === 2 && !step2Valid) return
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1))
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 0))
  }

  return (
    <div className="space-y-7 pb-1">
      <header className="sticky top-0 z-20 -mx-4 border-b border-white/5 bg-background/80 px-4 pb-4 pt-1 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          {step === 0 ? (
            <Link
              to="/explore"
              aria-label="Trustfall home"
              className="group inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-surface-elevated"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-[11px] font-bold tracking-[0.14em] text-primary shadow-[0_8px_20px_-10px_rgba(47,99,230,0.8)]">
                TF
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={previousStep}
              aria-label="Go back"
              className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition hover:bg-surface-elevated"
            >
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path
                  d="M15 5l-7 7 7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <div className="text-center">
            <h1 className="text-center text-[2rem] font-semibold tracking-tight text-primary">
              Match
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
          </div>
          <span aria-hidden className="h-10 w-10" />
        </div>
      </header>

      {step === 0 ? (
        <section className="space-y-8 pt-3">
          <div className="space-y-2">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted/75">
              Service Type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STEP_ONE_CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setRequest((current) => ({ ...current, category: option.value }))
                  }
                  className={cn(
                    'rounded-xl border px-2 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition',
                    request.category === option.value
                      ? 'border-primary bg-primary/20 text-foreground'
                      : 'border-border bg-surface text-muted hover:border-primary/50 hover:text-secondary',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-8">
          <div className="space-y-4 text-center">
            <h1 className="text-[2.7rem] font-semibold leading-[1.06] tracking-tight text-foreground">
              Describe
              <br />
              Your Vision
            </h1>
            <p className="mx-auto max-w-sm text-[1.12rem] leading-relaxed text-muted/90">
              The more detail you provide, the better we can match you with an artist
              who understands your specific aesthetic.
            </p>
          </div>

          <div className="tf-card space-y-0 overflow-hidden rounded-[1.9rem] border-white/5 bg-surface-container-low p-1">
            <textarea
              rows={6}
              value={request.notes}
              onChange={(event) =>
                setRequest((current) => ({ ...current, notes: event.target.value }))
              }
              className="min-h-[18rem] w-full resize-none rounded-[1.55rem] border border-transparent bg-surface px-6 py-6 text-[1.5rem] font-medium leading-relaxed text-foreground placeholder:text-muted/45 focus:border-primary/30 focus:outline-none"
              placeholder="Tell us your vibe, event, or specific details..."
            />

            <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
              <div className="flex items-center gap-2 text-muted/75">
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M4 12h9M4 7h13M4 17h7" strokeLinecap="round" />
                  <path
                    d="M16 14l2 2 4-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  Visual Brief
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="cursor-pointer rounded-full border border-border bg-surface-elevated px-3 py-2 text-[11px] font-medium text-secondary transition hover:border-primary/40 hover:text-foreground">
                  Attach
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <label className="cursor-pointer rounded-full border border-border bg-surface-elevated px-3 py-2 text-[11px] font-medium text-secondary transition hover:border-primary/40 hover:text-foreground">
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture={cameraCaptureMode}
                    onChange={handleCurrentPhotoChange}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setIsSavedLooksOpen((current) => !current)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-[11px] font-medium transition',
                    isSavedLooksOpen
                      ? 'border-primary bg-primary/20 text-foreground'
                      : 'border-border bg-surface-elevated text-secondary hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  Saved
                </button>
              </div>
            </div>

            {inspirationPreviewSrc || currentPhotoPreviewSrc ? (
              <div className="grid grid-cols-1 gap-3 border-t border-white/5 px-4 pb-4 pt-3 sm:grid-cols-2 sm:px-5">
                {inspirationPreviewSrc ? (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Inspiration
                    </p>
                    <div className="aspect-[4/5] max-h-[220px] w-full overflow-hidden rounded-xl bg-surface-elevated sm:max-h-[260px]">
                      <img
                        src={inspirationPreviewSrc}
                        alt="Inspiration preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {request.imageName ? (
                      <p className="mt-2 truncate text-xs text-muted">{request.imageName}</p>
                    ) : null}
                  </div>
                ) : null}
                {currentPhotoPreviewSrc ? (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                      Your photo
                    </p>
                    <div className="aspect-[4/5] max-h-[220px] w-full overflow-hidden rounded-xl bg-surface-elevated sm:max-h-[260px]">
                      <img
                        src={currentPhotoPreviewSrc}
                        alt="Your photo preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {request.currentPhotoName ? (
                      <p className="mt-2 truncate text-xs text-muted">
                        {request.currentPhotoName}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {isSavedLooksOpen ? (
            <div className="tf-card space-y-2 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/80">
                Use Saved Looks
              </p>
              {savedLooks.length > 0 ? (
                <div className="tf-no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {savedLooks.map((look) => {
                    const isActive = selectedSavedLookId === look.id
                    return (
                      <button
                        key={look.id}
                        type="button"
                        onClick={() => {
                          inspirationFileRef.current = null
                          if (inspirationBlobUrlRef.current) {
                            URL.revokeObjectURL(inspirationBlobUrlRef.current)
                            inspirationBlobUrlRef.current = null
                          }
                          setInspirationPreviewSrc(look.imageUrl)
                          setSelectedSavedLookId(look.id)
                          setRequest((current) => ({
                            ...current,
                            imageName: `Saved look: ${look.serviceTitle}`,
                            notes: buildSavedLookDescription(look),
                          }))
                        }}
                        className={cn(
                          'flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border text-left transition',
                          isActive ? 'border-primary' : 'border-border',
                        )}
                      >
                        <div className="aspect-[4/5] w-full bg-surface-elevated">
                          <img
                            src={look.imageUrl}
                            alt={look.serviceTitle}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="space-y-0.5 px-2.5 py-2">
                          <p className="line-clamp-1 text-xs font-semibold text-foreground">
                            {look.serviceTitle}
                          </p>
                          <p className="line-clamp-1 text-[10px] text-muted">
                            {look.professionalName}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted">
                  No saved looks yet. Save a look from Explore to reuse it here.
                </p>
              )}
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted/70">
              Need Inspiration?
            </p>
            <div className="flex flex-col items-center gap-2.5">
              {visionSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    setRequest((current) => ({ ...current, notes: suggestion }))
                  }
                  className="rounded-full border border-border bg-surface-container-high px-6 py-2.5 text-sm font-medium text-secondary transition hover:border-primary/40 hover:bg-surface-bright hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Refine Your Match
            </h2>
            <p className="text-[15px] leading-relaxed text-muted">
              Add style tags and your location so we can narrow your best matches.
            </p>
          </div>

          <div className="tf-card space-y-4 p-4">
            <label className="block space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted/85">
                Style Tags
              </span>
              <div className="flex flex-wrap gap-2.5">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'rounded-xl border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition',
                      request.tags.includes(tag)
                        ? 'border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_-10px_rgba(47,99,230,0.78)]'
                        : 'border-border bg-surface-elevated text-muted hover:border-primary/50 hover:text-secondary',
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted/85">
                Location
              </span>
              <input
                type="text"
                value={request.location}
                onChange={(event) =>
                  setRequest((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="City or zip"
                className="tf-input h-11"
              />
              <button
                type="button"
                onClick={() =>
                  setRequest((current) => ({ ...current, location: 'Using current area' }))
                }
                className="inline-flex text-xs font-semibold text-accent transition hover:text-foreground"
              >
                Use my location
              </button>
            </label>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Review & Match
            </h2>
            <p className="text-sm text-muted">
              Confirm your details, then we&apos;ll generate your best-fit professionals.
            </p>
          </div>
          <div className="tf-card space-y-3 p-4 text-sm">
            <p className="text-secondary">
              <span className="text-muted">Vision:</span>{' '}
              {request.notes || 'No description added'}
            </p>
            <p className="text-secondary">
              <span className="text-muted">Category:</span> {request.category || 'Not set'}
            </p>
            <p className="text-secondary">
              <span className="text-muted">Location:</span>{' '}
              {request.location || 'Not set'}
            </p>
            {request.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {request.tags.map((tag) => (
                  <span
                    key={tag}
                    className="tf-tag px-2.5 py-1 text-[10px] uppercase tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <footer className="sticky bottom-[calc(4.9rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-white/5 bg-background/90 px-4 pb-2 pt-4 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 0}
            className={cn(
              'tf-button-secondary w-full',
              step === 0 && 'pointer-events-none opacity-40',
            )}
          >
            Back
          </button>
          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={
                (step === 0 && !step0Valid) ||
                (step === 1 && !step1Valid) ||
                (step === 2 && !step2Valid)
              }
              className={cn(
                'tf-button-primary w-full',
                ((step === 0 && !step0Valid) ||
                  (step === 1 && !step1Valid) ||
                  (step === 2 && !step2Valid)) &&
                  'pointer-events-none opacity-50',
              )}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submitRequest}
              disabled={!canSubmit}
              className={cn(
                'tf-button-primary w-full',
                !canSubmit && 'pointer-events-none opacity-50',
              )}
            >
              Find Matches
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
