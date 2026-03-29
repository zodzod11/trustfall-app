import { useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import type { ServiceCategory } from '../types'
import { cn } from '../utils/cn'

type ContactPreference = 'text' | 'call' | 'email'

type OnboardingState = {
  firstName: string
  categories: ServiceCategory[]
  styleTags: string[]
  inspirationFileName: string
  location: string
  contactPreference: ContactPreference | null
}

const STEP_TITLES = [
  'Welcome',
  'Category',
  'Style & Inspiration',
  'Location',
  'Contact',
  'Complete',
] as const

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'barber', label: 'Barber' },
  { value: 'hair', label: 'Hair' },
  { value: 'nails', label: 'Nails' },
  { value: 'makeup', label: 'Makeup' },
]

const STYLE_TAG_OPTIONS = [
  'clean',
  'soft-glam',
  'editorial',
  'classic',
  'natural',
  'bold',
  'chrome',
  'bridal',
] as const

export function OnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState<OnboardingState>({
    firstName: '',
    categories: [],
    styleTags: [],
    inspirationFileName: '',
    location: '',
    contactPreference: null,
  })

  const totalSteps = STEP_TITLES.length
  const isLastStep = stepIndex === totalSteps - 1
  const progressValue = ((stepIndex + 1) / totalSteps) * 100

  const personalizedName = form.firstName.trim() || 'there'

  const canContinue = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return form.firstName.trim().length > 0
      case 1:
        return form.categories.length > 0
      case 2:
        return form.styleTags.length > 0 || form.inspirationFileName.length > 0
      case 3:
        return form.location.trim().length > 0
      case 4:
        return form.contactPreference !== null
      default:
        return true
    }
  }, [form, stepIndex])

  function toggleCategory(category: ServiceCategory) {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((c) => c !== category)
        : [...current.categories, category],
    }))
  }

  function toggleStyleTag(tag: string) {
    setForm((current) => ({
      ...current,
      styleTags: current.styleTags.includes(tag)
        ? current.styleTags.filter((t) => t !== tag)
        : [...current.styleTags, tag],
    }))
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setForm((current) => ({
      ...current,
      inspirationFileName: file ? file.name : '',
    }))
  }

  function nextStep() {
    if (!canContinue || isLastStep) return
    setStepIndex((current) => Math.min(current + 1, totalSteps - 1))
  }

  function previousStep() {
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-background px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.2rem+env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute -right-1/4 bottom-0 h-[380px] w-[380px] rounded-full bg-accent/16 blur-[90px]" />
      </div>

      <div className="relative flex flex-1 flex-col gap-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
              Trustfall
            </p>
            <p className="text-xs text-muted">
              {stepIndex + 1}/{totalSteps}
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {STEP_TITLES[stepIndex]}
          </p>
        </header>

        <section className="tf-card flex-1 space-y-5 p-5">
          {stepIndex === 0 ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome to Trustfall
              </h1>
              <p className="text-sm leading-relaxed text-muted">
                Let&apos;s tailor your feed in under a minute. What should we call
                you?
              </p>
              <input
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, firstName: event.target.value }))
                }
                className="tf-input"
                placeholder="First name"
              />
            </>
          ) : null}

          {stepIndex === 1 ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Nice to meet you, {personalizedName}
              </h2>
              <p className="text-sm text-muted">What services are you looking for?</p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORY_OPTIONS.map((option) => {
                  const active = form.categories.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleCategory(option.value)}
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-sm font-medium transition',
                        active
                          ? 'border-primary bg-primary/20 text-foreground'
                          : 'border-border bg-background text-muted hover:border-primary/50',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </>
          ) : null}

          {stepIndex === 2 ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                What style are you into?
              </h2>
              <p className="text-sm text-muted">
                Pick tags and optionally upload inspiration.
              </p>
              <div className="flex flex-wrap gap-2">
                {STYLE_TAG_OPTIONS.map((tag) => {
                  const active = form.styleTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleStyleTag(tag)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition',
                        active
                          ? 'border-primary bg-primary/20 text-foreground'
                          : 'border-border bg-background text-muted hover:border-primary/50',
                      )}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Inspiration Upload
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="tf-input file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
                />
              </label>
              {form.inspirationFileName ? (
                <p className="text-xs text-secondary">
                  Uploaded: {form.inspirationFileName}
                </p>
              ) : null}
            </>
          ) : null}

          {stepIndex === 3 ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Where should we search?
              </h2>
              <p className="text-sm text-muted">City or neighborhood works best.</p>
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                className="tf-input"
                placeholder="Houston, Austin, Dallas..."
              />
            </>
          ) : null}

          {stepIndex === 4 ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Contact preference
              </h2>
              <p className="text-sm text-muted">
                How do you want professionals to reach you first?
              </p>
              <div className="space-y-2">
                {(['text', 'call', 'email'] as ContactPreference[]).map((pref) => {
                  const active = form.contactPreference === pref
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, contactPreference: pref }))
                      }
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium capitalize transition',
                        active
                          ? 'border-primary bg-primary/20 text-foreground'
                          : 'border-border bg-background text-muted hover:border-primary/50',
                      )}
                    >
                      {pref}
                      {active ? <span className="text-accent">Selected</span> : null}
                    </button>
                  )
                })}
              </div>
            </>
          ) : null}

          {stepIndex === 5 ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                You&apos;re all set, {personalizedName}
              </h2>
              <p className="text-sm text-muted">
                We&apos;ll prioritize {form.categories.join(', ')} looks near {form.location}.
              </p>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="tf-card px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted">Style tags</p>
                  <p className="text-secondary">
                    {form.styleTags.length > 0 ? form.styleTags.join(', ') : 'None selected'}
                  </p>
                </div>
                <div className="tf-card px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted">Contact</p>
                  <p className="capitalize text-secondary">
                    {form.contactPreference ?? 'Not selected'}
                  </p>
                </div>
              </div>
              <Link to="/explore" className="tf-button-primary flex w-full">
                Enter Trustfall
              </Link>
            </>
          ) : null}
        </section>

        {!isLastStep ? (
          <footer className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={previousStep}
              disabled={stepIndex === 0}
              className={cn(
                'tf-button-secondary w-full',
                stepIndex === 0 && 'pointer-events-none opacity-45',
              )}
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={!canContinue}
              className={cn(
                'tf-button-primary w-full',
                !canContinue && 'pointer-events-none opacity-50',
              )}
            >
              Continue
            </button>
          </footer>
        ) : (
          <p className="text-center text-xs text-muted/75">
            Preferences are stored in local page state only.
          </p>
        )}
      </div>
    </div>
  )
}
