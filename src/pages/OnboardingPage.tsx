import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import {
  canProceedFromStep,
  ONBOARDING_CATEGORY_OPTIONS,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STYLE_TAG_OPTIONS,
  stepTitleAt,
  getSessionIssueHelp,
  isNeedsEmailAuthSessionError,
  SESSION_ERROR_NEEDS_EMAIL_AUTH,
  useOnboardingFlow,
} from '../onboarding'
import { applyOnboardingCredentials } from '../lib/auth/applyOnboardingCredentials'
import { ensureAuthSession } from '../lib/match/ensureSession'
import { createOnboardingApi } from '../services/onboarding'
import type { ServiceCategory } from '../types'
import { createClient } from '../lib/client'
import { cn } from '../utils/cn'

type ContactPreference = 'text' | 'call' | 'email'

export function OnboardingPage() {
  const navigate = useNavigate()
  const supabase = useMemo(() => createClient(), [])
  const api = useMemo(() => createOnboardingApi(supabase), [supabase])
  const prepareHydration = useCallback(async () => {
    const session = await ensureAuthSession(supabase)
    if (session.needsEmailAuthFallback) {
      throw new Error(SESSION_ERROR_NEEDS_EMAIL_AUTH)
    }
    if (session.error) throw new Error(session.error)
  }, [supabase])
  const {
    model,
    shouldSkip,
    patchDraft,
    goNext,
    goBack,
    saveProgress,
    clearPersistError,
    complete,
  } = useOnboardingFlow(api, { prepareHydration })

  const [syncHint, setSyncHint] = useState<string | null>(null)

  const { stepIndex, draft, hydration, persist } = model
  const form = draft
  const totalSteps = ONBOARDING_STEP_COUNT
  const isLastStep = stepIndex === totalSteps - 1
  const progressValue = ((stepIndex + 1) / totalSteps) * 100

  const personalizedName = form.firstName.trim() || 'there'

  const onboardingReady = hydration.phase === 'ready'

  const canContinue = useMemo(() => {
    if (!onboardingReady) return false
    if (persist.phase === 'saving') return false
    return canProceedFromStep(stepIndex, form)
  }, [form, stepIndex, persist.phase, onboardingReady])

  function toggleCategory(category: ServiceCategory) {
    patchDraft({
      categories: form.categories.includes(category)
        ? form.categories.filter((c) => c !== category)
        : [...form.categories, category],
    })
  }

  function toggleStyleTag(tag: string) {
    patchDraft({
      styleTags: form.styleTags.includes(tag)
        ? form.styleTags.filter((t) => t !== tag)
        : [...form.styleTags, tag],
    })
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    patchDraft({ inspirationFileName: file ? file.name : '' })
  }

  async function handleContinue() {
    if (!onboardingReady) return
    if (!canProceedFromStep(stepIndex, form)) return
    clearPersistError()
    setSyncHint(null)
    const session = await ensureAuthSession(supabase)
    if (session.needsEmailAuthFallback) {
      navigate('/sign-up?reason=anonymous_disabled&next=%2Fonboarding', { replace: true })
      return
    }
    if (session.error) {
      if (hydration.phase !== 'error') setSyncHint(session.error)
      return
    }
    if (stepIndex === 5) {
      const cred = await applyOnboardingCredentials(supabase, form.email, form.password)
      if (cred.error) {
        setSyncHint(cred.error)
        return
      }
      patchDraft({ password: '' })
    }
    const save = await saveProgress()
    if (!save.ok) {
      clearPersistError()
      setSyncHint(`Could not save: ${save.message}`)
      return
    }
    goNext()
  }

  async function handleFinish() {
    if (!onboardingReady) return
    clearPersistError()
    setSyncHint(null)
    const session = await ensureAuthSession(supabase)
    if (session.needsEmailAuthFallback) {
      navigate('/sign-up?reason=anonymous_disabled&next=%2Fonboarding', { replace: true })
      return
    }
    if (session.error) {
      if (hydration.phase !== 'error') setSyncHint(session.error)
      return
    }
    const result = await complete()
    if (!result.ok) {
      clearPersistError()
      setSyncHint(result.message)
      return
    }
    navigate('/explore', { replace: true })
  }

  function previousStep() {
    setSyncHint(null)
    clearPersistError()
    goBack()
  }

  const redirectingEmailAuth =
    hydration.phase === 'error' && isNeedsEmailAuthSessionError(hydration.message)

  useEffect(() => {
    if (redirectingEmailAuth) {
      navigate('/sign-up?reason=anonymous_disabled&next=%2Fonboarding', { replace: true })
    }
  }, [redirectingEmailAuth, navigate])

  if (shouldSkip) {
    return <Navigate to="/explore" replace />
  }

  if (redirectingEmailAuth) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
        <p className="text-sm text-muted">Redirecting to sign up…</p>
      </div>
    )
  }

  const isHydrating = hydration.phase === 'loading'
  const sessionHelp =
    hydration.phase === 'error' && hydration.message ? getSessionIssueHelp(hydration.message) : null

  return (
    <div className="relative flex min-h-dvh flex-col bg-background px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.2rem+env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute -right-1/4 bottom-0 h-[380px] w-[380px] rounded-full bg-accent/16 blur-[90px]" />
      </div>

      <div className="relative flex flex-1 flex-col gap-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <TrustfallLogo size="page" className="shrink-0" />
            <p className="text-xs text-muted tabular-nums">
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
            {stepTitleAt(stepIndex)}
          </p>
          {isHydrating ? (
            <p className="text-xs text-muted/90">Loading your saved preferences…</p>
          ) : null}
          {sessionHelp ? (
            <div className="space-y-2 text-xs text-muted/90">
              {sessionHelp.lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              <div className="flex flex-wrap gap-3">
                {sessionHelp.suggestEmailSignUp ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/sign-up?reason=anonymous_disabled&next=%2Fonboarding')
                    }
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Create account (email)
                  </button>
                ) : null}
                {sessionHelp.suggestSignIn ? (
                  <button
                    type="button"
                    onClick={() => navigate('/sign-in?next=%2Fonboarding')}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Sign in
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {persist.phase === 'error' && persist.message ? (
            <p className="text-xs text-destructive/90" role="alert">
              {persist.message}
            </p>
          ) : null}
          {syncHint ? <p className="text-xs text-muted/90">{syncHint}</p> : null}
        </header>

        <section
          className={cn(
            'tf-card flex-1 space-y-5 p-5',
            (isHydrating || !onboardingReady) && 'pointer-events-none opacity-70',
          )}
          aria-busy={isHydrating || !onboardingReady}
        >
          {stepIndex === 0 ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome to Trustfall
              </h1>
              <p className="text-sm leading-relaxed text-muted">
                Let&apos;s tailor your feed in under a minute. What should we call you?
              </p>
              <input
                value={form.firstName}
                onChange={(event) => patchDraft({ firstName: event.target.value })}
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
                {ONBOARDING_CATEGORY_OPTIONS.map((option) => {
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
                Pick tags and optionally add an inspiration reference (saved as a label only — real
                photo upload is in Get Matched).
              </p>
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_STYLE_TAG_OPTIONS.map((tag) => {
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
                  Inspiration reference (optional)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="tf-input file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
                />
              </label>
              {form.inspirationFileName ? (
                <p className="text-xs text-secondary">Reference: {form.inspirationFileName}</p>
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
                onChange={(event) => patchDraft({ location: event.target.value })}
                className="tf-input"
                placeholder="Houston, Austin, Dallas..."
              />
            </>
          ) : null}

          {stepIndex === 4 ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Contact</h2>
              <p className="text-sm text-muted">
                Add your email and phone for your profile. Then choose how pros should reach you first.
              </p>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Email
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => patchDraft({ email: e.target.value })}
                  className="tf-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Phone
                </span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => patchDraft({ phone: e.target.value })}
                  className="tf-input"
                  placeholder="Mobile number"
                  autoComplete="tel"
                />
              </label>
              <p className="text-sm text-muted">Preferred first contact</p>
              <div className="space-y-2">
                {(['text', 'call', 'email'] as ContactPreference[]).map((pref) => {
                  const active = form.contactPreference === pref
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => patchDraft({ contactPreference: pref })}
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
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Create your login</h2>
              <p className="text-sm text-muted">
                This step saves your email and password in Supabase so your profile stays tied to this
                account. Use at least 8 characters.
              </p>
              <input
                type="password"
                value={form.password}
                onChange={(e) => patchDraft({ password: e.target.value })}
                className="tf-input"
                placeholder="Password"
                autoComplete="new-password"
              />
            </>
          ) : null}

          {stepIndex === 6 ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                You&apos;re all set, {personalizedName}
              </h2>
              <p className="text-sm text-muted">
                We&apos;ll prioritize {form.categories.join(', ')} looks near {form.location}.
              </p>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="tf-card px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted">Email</p>
                  <p className="text-secondary">{form.email.trim() || '—'}</p>
                </div>
                <div className="tf-card px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted">Phone</p>
                  <p className="text-secondary">{form.phone.trim() || '—'}</p>
                </div>
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
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={persist.phase === 'saving' || !onboardingReady}
                className={cn(
                  'tf-button-primary w-full',
                  (persist.phase === 'saving' || !onboardingReady) && 'pointer-events-none opacity-70',
                )}
              >
                {persist.phase === 'saving' ? 'Finishing…' : 'Enter Trustfall'}
              </button>
            </>
          ) : null}
        </section>

        {!isLastStep ? (
          <footer className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => (stepIndex === 0 ? navigate('/', { replace: true }) : previousStep())}
              className="tf-button-secondary w-full"
            >
              {stepIndex === 0 ? 'Exit' : 'Back'}
            </button>
            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={!canContinue}
              className={cn(
                'tf-button-primary w-full',
                !canContinue && 'pointer-events-none opacity-50',
              )}
            >
              {persist.phase === 'saving' ? 'Saving…' : 'Continue'}
            </button>
          </footer>
        ) : (
          <p className="text-center text-xs text-muted/75">
            Finishing saves your profile and preferences to Supabase and unlocks the app.
          </p>
        )}
      </div>
    </div>
  )
}
