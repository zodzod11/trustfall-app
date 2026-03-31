import { useEffect, useState, type ChangeEvent } from 'react'
import { usersSeed } from '../../data/seed'
import type { RequestSubmission } from '../../types'

const demoUser = usersSeed[0]

async function fileToAttachmentPart(file: File): Promise<{
  filename: string
  contentType: string
  base64: string
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      const base64 = comma >= 0 ? result.slice(comma + 1) : result
      resolve({
        filename: file.name || 'image',
        contentType: file.type || 'application/octet-stream',
        base64,
      })
    }
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

export const DEFAULT_REQUEST_MESSAGE =
  'Hi, I’m interested in this style and wanted to check availability.'

type RequestModalProps = {
  onClose: () => void
  portfolioItemId: string
  portfolioImageUrl: string
  serviceTitle: string
  proName: string
  phoneNumber?: string
  /** Pro booking email when available (mock seed / future CRM). */
  proEmail?: string
  initialMessage?: string
  initialPreferredDate?: string
  initialInspirationName?: string
  initialCurrentPhotoName?: string
  /** Files carried from the match wizard (read from session before opening the modal). */
  initialInspirationFile?: File | null
  initialCurrentPhotoFile?: File | null
  onSubmit: (payload: RequestSubmission) => void
}

export function RequestModal({
  onClose,
  portfolioItemId,
  portfolioImageUrl,
  serviceTitle,
  proName,
  phoneNumber = '+17135551234',
  proEmail,
  initialMessage,
  initialPreferredDate = '',
  initialInspirationName = '',
  initialCurrentPhotoName = '',
  initialInspirationFile = null,
  initialCurrentPhotoFile = null,
  onSubmit,
}: RequestModalProps) {
  const [message, setMessage] = useState(initialMessage ?? DEFAULT_REQUEST_MESSAGE)
  const [preferredDate, setPreferredDate] = useState(initialPreferredDate)
  const [clientName, setClientName] = useState(
    () => `${demoUser.firstName} ${demoUser.lastName}`.trim(),
  )
  const [clientEmail, setClientEmail] = useState(demoUser.email)
  const [clientPhone, setClientPhone] = useState(demoUser.phone ?? '')
  const [inspirationFile, setInspirationFile] = useState<File | null>(null)
  const [currentPhotoFile, setCurrentPhotoFile] = useState<File | null>(null)
  const [inspirationImageName, setInspirationImageName] = useState(
    initialInspirationName,
  )
  const [currentPhotoName, setCurrentPhotoName] = useState(initialCurrentPhotoName)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notifyChannels, setNotifyChannels] = useState<string[] | null>(null)
  const [notifyWarning, setNotifyWarning] = useState<string | null>(null)
  const [inspirationPreviewUrl, setInspirationPreviewUrl] = useState<string | null>(
    null,
  )
  const [currentPhotoPreviewUrl, setCurrentPhotoPreviewUrl] = useState<string | null>(
    null,
  )

  useEffect(() => {
    if (!inspirationFile) {
      setInspirationPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(inspirationFile)
    setInspirationPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [inspirationFile])

  useEffect(() => {
    if (!currentPhotoFile) {
      setCurrentPhotoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(currentPhotoFile)
    setCurrentPhotoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [currentPhotoFile])

  useEffect(() => {
    setMessage(initialMessage ?? DEFAULT_REQUEST_MESSAGE)
    setPreferredDate(initialPreferredDate)
    if (initialInspirationFile) {
      setInspirationFile(initialInspirationFile)
      setInspirationImageName(initialInspirationFile.name)
    } else {
      setInspirationFile(null)
      setInspirationImageName(initialInspirationName)
    }
    if (initialCurrentPhotoFile) {
      setCurrentPhotoFile(initialCurrentPhotoFile)
      setCurrentPhotoName(initialCurrentPhotoFile.name)
    } else {
      setCurrentPhotoFile(null)
      setCurrentPhotoName(initialCurrentPhotoName)
    }
    setSubmitted(false)
    setNotifyChannels(null)
    setNotifyWarning(null)
  }, [
    portfolioItemId,
    initialMessage,
    initialPreferredDate,
    initialInspirationName,
    initialCurrentPhotoName,
    initialInspirationFile,
    initialCurrentPhotoFile,
  ])

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    type: 'inspiration' | 'current',
  ) {
    const file = event.target.files?.[0] ?? null
    const name = file?.name ?? ''
    if (type === 'inspiration') {
      setInspirationFile(file)
      setInspirationImageName(name)
      return
    }
    setCurrentPhotoFile(file)
    setCurrentPhotoName(name)
  }

  async function submit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setNotifyChannels(null)
    setNotifyWarning(null)

    const payload: RequestSubmission = {
      portfolioItemId,
      proName,
      message: message.trim() || DEFAULT_REQUEST_MESSAGE,
      preferredDate,
      inspirationImageName,
      currentPhotoName,
      createdAt: new Date().toISOString(),
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim(),
      portfolioImageUrl:
        portfolioImageUrl.startsWith('http://') || portfolioImageUrl.startsWith('https://')
          ? portfolioImageUrl
          : undefined,
    }
    onSubmit(payload)

    const endpoint =
      import.meta.env.VITE_NOTIFY_API_URL ??
      (import.meta.env.DEV ? '/api/notify-request' : 'http://localhost:8787/api/notify-request')

    let attachments: {
      inspiration: { filename: string; contentType: string; base64: string } | null
      current: { filename: string; contentType: string; base64: string } | null
    } = { inspiration: null, current: null }
    const fileWarnings: string[] = []
    if (inspirationFile) {
      try {
        attachments = {
          ...attachments,
          inspiration: await fileToAttachmentPart(inspirationFile),
        }
      } catch {
        fileWarnings.push('Inspiration image could not be attached (try a smaller file).')
      }
    }
    if (currentPhotoFile) {
      try {
        attachments = { ...attachments, current: await fileToAttachmentPart(currentPhotoFile) }
      } catch {
        fileWarnings.push('Current photo could not be attached (try a smaller file).')
      }
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          serviceTitle,
          phoneNumber,
          proEmail: proEmail ?? '',
          attachments,
        }),
      })
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean
        sent?: string[]
        errors?: { sms?: string; email?: string }
        message?: string
        error?: string
      } | null
      const sentList = Array.isArray(data?.sent) ? data.sent : []
      const errSms = data?.errors?.sms
      const errEmail = data?.errors?.email

      if (sentList.length > 0) {
        setNotifyChannels(sentList)
      }
      const warnParts: string[] = [...fileWarnings]
      if (errSms) warnParts.push(`SMS: ${errSms}`)
      if (errEmail) warnParts.push(`Email: ${errEmail}`)
      if (warnParts.length > 0) {
        setNotifyWarning(warnParts.join(' '))
      } else if (response.ok && sentList.length === 0) {
        setNotifyWarning(
          data?.message ??
            'Notify server is up but SMS/email are not configured (check notifications.local).',
        )
      } else if (!response.ok) {
        setNotifyWarning(
          data?.message ??
            data?.error ??
            `Notification request failed (${response.status}). Check the notify server logs.`,
        )
      }
    } catch {
      setNotifyWarning(
        'Could not reach the notify server. If you only ran npm run dev, start the API too: npm run dev:all (or run npm run notify:server in a second terminal).',
      )
    } finally {
      setSubmitted(true)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-background/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="tf-no-scrollbar tf-card max-h-[88dvh] w-full max-w-lg overflow-y-auto p-4 sm:p-5">
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

            <div className="rounded-2xl border border-border bg-surface/50 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Your contact (included in the request)
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-secondary">Name</span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  className="tf-input"
                  autoComplete="name"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-secondary">Email</span>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  className="tf-input"
                  autoComplete="email"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-secondary">Phone</span>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  className="tf-input"
                  autoComplete="tel"
                />
              </label>
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

            {inspirationPreviewUrl || currentPhotoPreviewUrl ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {inspirationPreviewUrl ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated/50 p-2">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Inspiration preview
                    </p>
                    <div className="aspect-[4/5] max-h-[180px] w-full overflow-hidden rounded-lg bg-surface-elevated">
                      <img
                        src={inspirationPreviewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ) : null}
                {currentPhotoPreviewUrl ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated/50 p-2">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Your photo preview
                    </p>
                    <div className="aspect-[4/5] max-h-[180px] w-full overflow-hidden rounded-lg bg-surface-elevated">
                      <img
                        src={currentPhotoPreviewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={isSubmitting}
              className="tf-button-primary w-full disabled:pointer-events-none disabled:opacity-60"
            >
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
            {notifyChannels && notifyChannels.length > 0 ? (
              <p className="text-xs text-muted">
                Notification also sent via {notifyChannels.join(' & ')}.
              </p>
            ) : null}
            {notifyWarning ? (
              <p className="text-xs text-secondary">{notifyWarning}</p>
            ) : null}
            <button type="button" onClick={onClose} className="tf-button-primary w-full">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
