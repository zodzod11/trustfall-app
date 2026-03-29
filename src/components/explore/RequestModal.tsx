import { useState, type ChangeEvent } from 'react'
import type { RequestSubmission } from '../../types'

export const DEFAULT_REQUEST_MESSAGE =
  'Hi, I’m interested in this style and wanted to check availability.'

type RequestModalProps = {
  onClose: () => void
  portfolioItemId: string
  portfolioImageUrl: string
  serviceTitle: string
  proName: string
  phoneNumber?: string
  initialMessage?: string
  onSubmit: (payload: RequestSubmission) => void
}

export function RequestModal({
  onClose,
  portfolioItemId,
  portfolioImageUrl,
  serviceTitle,
  proName,
  phoneNumber = '+17135551234',
  initialMessage,
  onSubmit,
}: RequestModalProps) {
  const [message, setMessage] = useState(initialMessage ?? DEFAULT_REQUEST_MESSAGE)
  const [preferredDate, setPreferredDate] = useState('')
  const [inspirationImageName, setInspirationImageName] = useState('')
  const [currentPhotoName, setCurrentPhotoName] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    type: 'inspiration' | 'current',
  ) {
    const file = event.target.files?.[0]
    const name = file?.name ?? ''
    if (type === 'inspiration') {
      setInspirationImageName(name)
      return
    }
    setCurrentPhotoName(name)
  }

  function submit() {
    const payload: RequestSubmission = {
      portfolioItemId,
      proName,
      message: message.trim() || DEFAULT_REQUEST_MESSAGE,
      preferredDate,
      inspirationImageName,
      currentPhotoName,
      createdAt: new Date().toISOString(),
    }
    onSubmit(payload)
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-background/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="tf-card max-h-[88dvh] w-full max-w-lg overflow-y-auto p-4 sm:p-5">
        {!submitted ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Send Request
                </p>
                <h3 className="text-lg font-semibold text-foreground">{proName}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="relative aspect-[16/10]">
                <img
                  src={portfolioImageUrl}
                  alt={`${serviceTitle} selected preview`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="bg-surface px-3 py-2">
                <p className="truncate text-sm font-medium text-secondary">{serviceTitle}</p>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-secondary">Message</span>
              <textarea
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="tf-input resize-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-secondary">Preferred date (optional)</span>
              <input
                type="date"
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
                className="tf-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-secondary">Upload inspiration images</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleFileChange(event, 'inspiration')}
                className="tf-input file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
              />
              {inspirationImageName ? (
                <p className="text-xs text-muted">Selected: {inspirationImageName}</p>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-secondary">Upload your current photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleFileChange(event, 'current')}
                className="tf-input file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground"
              />
              {currentPhotoName ? (
                <p className="text-xs text-muted">Selected: {currentPhotoName}</p>
              ) : null}
            </label>

            <button type="button" onClick={submit} className="tf-button-primary w-full">
              Send Request
            </button>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${phoneNumber}`} className="tf-button-secondary w-full text-center">
                Call
              </a>
              <a href={`sms:${phoneNumber}`} className="tf-button-secondary w-full text-center">
                Text
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Request Sent
            </p>
            <h3 className="text-xl font-semibold text-foreground">
              Success! {proName} has your request.
            </h3>
            <p className="text-sm text-muted">
              We saved your message and attachments locally for this session.
            </p>
            <button type="button" onClick={onClose} className="tf-button-primary w-full">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
