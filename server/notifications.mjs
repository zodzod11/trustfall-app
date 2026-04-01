import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import twilio from 'twilio'
import sgMail from '@sendgrid/mail'
import { createClient } from '@supabase/supabase-js'

const __notifyDir = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__notifyDir, '..', '.env.local') })
dotenv.config({ path: './notifications.local' })
dotenv.config({ path: './sendgrid.env' })

const app = express()
app.use(cors())
app.use(express.json({ limit: '25mb' }))

const port = Number(process.env.NOTIFY_PORT ?? 8787)

const twilioSid = process.env.TWILIO_ACCOUNT_SID
const twilioToken = process.env.TWILIO_AUTH_TOKEN
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER
const twilioClient =
  twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null

const sendgridApiKey = process.env.SENDGRID_API_KEY
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey)
}
if ((process.env.SENDGRID_REGION ?? '').toLowerCase() === 'eu') {
  sgMail.setDataResidency('eu')
}

/** Fixed CIDs for fallback inline uploads when no storage path / signing. */
const CID_INLINE_INSPIRATION = 'tf-inspiration'
const CID_INLINE_CURRENT = 'tf-current'

/** Private bucket for contact-request client photos (see supabase/migrations/20260330150000_trustfall_storage.sql). */
const CLIENT_UPLOADS_BUCKET = 'client-uploads'
/** 7 days — signed URLs for email img tags (many clients ignore cid:). */
const SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    ''
  ).trim()
}

function getSupabaseServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
}

let supabaseAdmin = null
function getSupabaseAdmin() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) return null
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return supabaseAdmin
}

/** Object key within the client-uploads bucket (strip optional bucket prefix). */
function normalizeClientUploadsPath(raw) {
  if (typeof raw !== 'string') return null
  let t = raw.trim().replace(/^\/+/, '')
  if (!t || t.includes('..')) return null
  if (t.startsWith(`${CLIENT_UPLOADS_BUCKET}/`)) {
    t = t.slice(CLIENT_UPLOADS_BUCKET.length + 1)
  }
  return t || null
}

function maskUrlForLog(url) {
  try {
    const u = new URL(url)
    if (u.searchParams.has('token')) u.searchParams.set('token', '(redacted)')
    return u.toString()
  } catch {
    return '(invalid url)'
  }
}

/**
 * @returns {Promise<{ signedUrl: string | null, error: string | null }>}
 */
async function createSignedUrlForClientUpload(objectPath) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return {
      signedUrl: null,
      error: 'Supabase admin not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    }
  }
  const normalized = normalizeClientUploadsPath(objectPath)
  if (!normalized) {
    return { signedUrl: null, error: 'Invalid or empty storage path' }
  }
  const { data, error } = await admin.storage
    .from(CLIENT_UPLOADS_BUCKET)
    .createSignedUrl(normalized, SIGNED_URL_EXPIRY_SECONDS)
  if (error) {
    return { signedUrl: null, error: error.message || String(error) }
  }
  if (!data?.signedUrl) {
    return { signedUrl: null, error: 'No signedUrl in response' }
  }
  return { signedUrl: data.signedUrl, error: null }
}

/** SMS is opt-in — set ENABLE_SMS=true when Twilio is ready. */
function isSmsEnabled() {
  return (process.env.ENABLE_SMS ?? '').toLowerCase() === 'true'
}

function formatTwilioError(error) {
  if (!error) return 'Unknown Twilio error'
  const parts = [error.message ?? String(error)]
  if (error.code != null) parts.push(`code ${error.code}`)
  if (error.moreInfo) parts.push(error.moreInfo)
  return parts.join(' · ')
}

function formatSendGridError(error) {
  if (!error) return 'Unknown SendGrid error'
  if (error.response?.body?.errors?.length) {
    return error.response.body.errors.map((e) => e.message).join('; ')
  }
  return error.message ?? String(error)
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Only allow http(s) for embedded portfolio preview — blocks javascript: etc. */
function safeHttpImageUrl(url) {
  if (typeof url !== 'string') return null
  const u = url.trim()
  if (u.startsWith('https://') || u.startsWith('http://')) return u
  return null
}

/**
 * Client-upload photos: always use &lt;img src&gt; (HTTPS signed URL or cid: fallback).
 * Do not put original filenames in the HTML body — alt text is generic only.
 * @param {{ inspiration: { kind: 'https', url: string } | { kind: 'cid' } | null, current: { kind: 'https', url: string } | { kind: 'cid' } | null }} slots
 */
function buildClientPhotosTableHtml(slots) {
  const { inspiration: inspSlot, current: curSlot } = slots
  if (!inspSlot && !curSlot) return ''

  const imgStyle =
    'display:block;max-width:100%;border-radius:8px;height:auto;border:1px solid #e2e8f0;'

  function row(title, slot, cid, withTopBorder) {
    if (!slot) return ''
    const alt = escapeHtml(title)
    const src =
      slot.kind === 'https' ? escapeHtml(slot.url) : `cid:${cid}`
    const border = withTopBorder ? 'border-top:1px solid #e8e8e8;' : ''
    const linkOrNote =
      slot.kind === 'https'
        ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.45;"><a href="${escapeHtml(
            slot.url,
          )}" style="color:#2563eb;text-decoration:underline;">Open image</a></p>`
        : `<p style="margin:10px 0 0;font-size:12px;color:#64748b;">If the image does not appear, check for inline attachments in this message.</p>`
    return `<tr>
            <td style="padding:16px;${border}">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">${escapeHtml(
                title,
              )}</p>
              <img src="${src}" alt="${alt}" width="520" style="${imgStyle}" />
              ${linkOrNote}
            </td>
          </tr>`
  }

  const firstInsp = inspSlot
    ? row('Inspiration', inspSlot, CID_INLINE_INSPIRATION, false)
    : ''
  const cur = curSlot
    ? row('Your current look', curSlot, CID_INLINE_CURRENT, Boolean(inspSlot))
    : ''

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;border:1px solid #e0e4ea;border-radius:12px;overflow:hidden;background:#fafbfc;">
          <tr>
            <td style="padding:12px 16px;background:#eef1f6;font-size:13px;font-weight:700;letter-spacing:0.04em;color:#334155;">Client inspiration &amp; current look</td>
          </tr>
          ${firstInsp || ''}
          ${cur || ''}
        </table>`
}

function buildRequestEmailHtml(fields) {
  const {
    proName,
    serviceTitle,
    clientName,
    clientEmail,
    clientPhone,
    portfolioImageUrl,
    message,
    preferredDate,
    createdAt,
    phoneNumber,
    proEmail,
    attachmentLabels,
    photoSlots,
  } = fields

  const hero = safeHttpImageUrl(portfolioImageUrl)
  const rows = [
    ['Professional', escapeHtml(proName)],
    ['Service', escapeHtml(serviceTitle)],
    ['Pro phone', escapeHtml(phoneNumber || '—')],
    ['Pro email', escapeHtml(proEmail || '—')],
    ['Client name', escapeHtml(clientName || '—')],
    ['Client email', escapeHtml(clientEmail || '—')],
    ['Client phone', escapeHtml(clientPhone || '—')],
    ['Preferred date', escapeHtml(preferredDate || 'Not set')],
  ]
  // Never put client upload filenames (e.g. IMG_0142.jpg) in the details table — images belong in the photo block above.
  rows.push(['Created', escapeHtml(createdAt || new Date().toISOString())])

  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;font-size:13px;color:#555;width:140px;vertical-align:top;">${k}</td><td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;font-size:14px;color:#111;vertical-align:top;">${v}</td></tr>`,
    )
    .join('')

  const msgBlock = `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#222;">${escapeHtml(
    message || '(empty)',
  ).replace(/\n/g, '<br/>')}</p>`

  const hasClientPhotoSection = Boolean(photoSlots.inspiration || photoSlots.current)
  const attachNote =
    attachmentLabels.length > 0 && !hasClientPhotoSection
      ? `<p style="margin:16px 0 0;font-size:13px;color:#444;"><strong>Attached:</strong> ${attachmentLabels.length} image(s) (inline).</p>`
      : ''

  const uploadsBlock = buildClientPhotosTableHtml(photoSlots)

  const heroBlock = hero
    ? `<div style="margin:0 0 20px;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">
        <img src="${escapeHtml(hero)}" alt="Selected look" width="560" style="display:block;max-width:100%;height:auto;" />
      </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e7;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:20px 24px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a8b4ff;">Trustfall</p>
              <h1 style="margin:6px 0 0;font-size:20px;font-weight:600;color:#ffffff;">New booking request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${heroBlock}
              <p style="margin:0 0 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#888;">Message</p>
              ${msgBlock}
              ${
                hasClientPhotoSection
                  ? `<p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#888;">Photos from the client</p>`
                  : ''
              }
              ${uploadsBlock}
              ${attachNote}
              <p style="margin:24px 0 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#888;">Details</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">${tableRows}</table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * SendGrid Dynamic Templates: {{{client_photos_section_html}}} uses triple braces (raw HTML).
 * Per-image HTTPS URLs (7-day signed): {{inspiration_image_url}}, {{current_photo_url}} when present.
 * Use {{{client_photos_section_html}}} for the full &lt;img&gt; block — do not render raw filenames in the template.
 */
function buildDynamicTemplateData(payload) {
  const {
    proName,
    serviceTitle,
    message,
    preferredDate,
    createdAt,
    clientName,
    clientEmail,
    clientPhone,
    portfolioImageUrl,
    phoneNumber,
    proEmail,
    photoSlots,
  } = payload

  const safeUrl = safeHttpImageUrl(portfolioImageUrl) || ''
  const hasClientPhotos = Boolean(photoSlots.inspiration || photoSlots.current)
  const clientPhotosSectionHtml = buildClientPhotosTableHtml(photoSlots)
  const inspirationHttps =
    photoSlots.inspiration?.kind === 'https' ? photoSlots.inspiration.url : ''
  const currentHttps =
    photoSlots.current?.kind === 'https' ? photoSlots.current.url : ''
  return {
    subject: `Trustfall Request: ${serviceTitle}`,
    pro_name: proName,
    service_title: serviceTitle,
    message,
    text_body: message || '',
    preferred_date: preferredDate || '',
    inspiration_filename: '',
    current_photo_filename: '',
    created_at: createdAt || new Date().toISOString(),
    client_name: clientName || '',
    client_email: clientEmail || '',
    client_phone: clientPhone || '',
    pro_phone: phoneNumber || '',
    pro_email: proEmail || '',
    portfolio_image_url: safeUrl,
    inspiration_image_url: inspirationHttps,
    current_photo_url: currentHttps,
    show_inspiration: Boolean(photoSlots.inspiration),
    show_current: Boolean(photoSlots.current),
    has_client_photos: hasClientPhotos,
    client_photos_section_html: clientPhotosSectionHtml,
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

/** Safe diagnostics — no secrets. */
app.get('/api/notify-status', (_req, res) => {
  const phone = process.env.NOTIFY_TO_PHONE ?? ''
  const maskedPhone =
    phone.length > 4 ? `***${phone.slice(-4)}` : phone ? '(set)' : '(not set)'
  res.json({
    ok: true,
    smsEnabled: isSmsEnabled(),
    twilio: {
      configured: Boolean(twilioClient && twilioFromNumber),
      hasFromNumber: Boolean(twilioFromNumber),
      hasDestination: Boolean(phone),
      destinationMasked: maskedPhone,
    },
    sendgrid: {
      configured: Boolean(sendgridApiKey && process.env.SENDGRID_FROM_EMAIL),
      hasTo: Boolean(process.env.NOTIFY_TO_EMAIL),
      requestTemplate: Boolean(
        (process.env.SENDGRID_REQUEST_TEMPLATE_ID ?? '').trim(),
      ),
    },
    supabaseSigning: {
      configured: Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey()),
      signedUrlExpiryDays: 7,
    },
  })
})

app.post('/api/notify-request', async (req, res) => {
  const notifyToPhone = process.env.NOTIFY_TO_PHONE
  const notifyToEmail = process.env.NOTIFY_TO_EMAIL
  const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL

  const body = req.body ?? {}
  const {
    proName = 'Unknown pro',
    serviceTitle = 'Unknown service',
    message = '',
    preferredDate = '',
    inspirationImageName = '',
    currentPhotoName = '',
    createdAt = '',
    clientName = '',
    clientEmail = '',
    clientPhone = '',
    portfolioImageUrl = '',
    phoneNumber = '',
    proEmail = '',
    attachments: attachmentPayload = {},
  } = body

  const inspirationStoragePath =
    body.inspirationStoragePath ?? body.inspiration_storage_path ?? ''
  const currentPhotoStoragePath =
    body.currentPhotoStoragePath ?? body.current_photo_storage_path ?? ''

  const insp = attachmentPayload?.inspiration
  const cur = attachmentPayload?.current
  const hasInspirationBase64 = Boolean(insp?.base64 && insp?.filename)
  const hasCurrentBase64 = Boolean(cur?.base64 && cur?.filename)

  console.log('[notify] inspiration storage path (raw):', inspirationStoragePath || '(none)')
  const inspSign = inspirationStoragePath
    ? await createSignedUrlForClientUpload(String(inspirationStoragePath))
    : { signedUrl: null, error: null }
  if (inspSign.signedUrl) {
    console.log(
      '[notify] inspiration generated signed URL (7d, for email img src):',
      maskUrlForLog(inspSign.signedUrl),
    )
  } else if (inspirationStoragePath) {
    console.warn(
      '[notify] inspiration signed URL generation FAILED:',
      inspSign.error ?? 'unknown',
    )
  }

  console.log('[notify] current photo storage path (raw):', currentPhotoStoragePath || '(none)')
  const curSign = currentPhotoStoragePath
    ? await createSignedUrlForClientUpload(String(currentPhotoStoragePath))
    : { signedUrl: null, error: null }
  if (curSign.signedUrl) {
    console.log(
      '[notify] current photo generated signed URL (7d, for email img src):',
      maskUrlForLog(curSign.signedUrl),
    )
  } else if (currentPhotoStoragePath) {
    console.warn(
      '[notify] current photo signed URL generation FAILED:',
      curSign.error ?? 'unknown',
    )
  }

  const photoSlots = {
    inspiration: inspSign.signedUrl
      ? { kind: 'https', url: inspSign.signedUrl }
      : hasInspirationBase64
        ? { kind: 'cid' }
        : null,
    current: curSign.signedUrl
      ? { kind: 'https', url: curSign.signedUrl }
      : hasCurrentBase64
        ? { kind: 'cid' }
        : null,
  }

  const textLines = [
    'New Trustfall Request',
    `Pro: ${proName}`,
    `Service: ${serviceTitle}`,
    `Pro phone: ${phoneNumber || '—'}`,
    `Pro email: ${proEmail || '—'}`,
    `Client: ${clientName || '—'}`,
    `Client email: ${clientEmail || '—'}`,
    `Client phone: ${clientPhone || '—'}`,
    `Preferred Date: ${preferredDate || 'Not set'}`,
    `Message: ${message || '(empty)'}`,
    `Look preview URL: ${portfolioImageUrl || '—'}`,
  ]
  if (photoSlots.inspiration?.kind === 'https') {
    textLines.push(
      `Inspiration image (signed URL, ${SIGNED_URL_EXPIRY_SECONDS / 86400} day expiry): ${photoSlots.inspiration.url}`,
    )
  } else if (photoSlots.inspiration?.kind === 'cid') {
    textLines.push('Inspiration image: embedded in HTML / inline attachment (no storage path).')
  } else {
    textLines.push('Inspiration image: not included (no storage path or attachment).')
  }
  if (photoSlots.current?.kind === 'https') {
    textLines.push(
      `Current look image (signed URL, ${SIGNED_URL_EXPIRY_SECONDS / 86400} day expiry): ${photoSlots.current.url}`,
    )
  } else if (photoSlots.current?.kind === 'cid') {
    textLines.push('Current look image: embedded in HTML / inline attachment (no storage path).')
  } else {
    textLines.push('Current look image: not included (no storage path or attachment).')
  }
  textLines.push(`Created: ${createdAt || new Date().toISOString()}`)
  const textBody = textLines.join('\n')

  const sgAttachments = []
  const attachmentLabels = []

  // CID fallback only when we are not using a fresh HTTPS signed URL for that slot.
  if (hasInspirationBase64 && photoSlots.inspiration?.kind !== 'https') {
    sgAttachments.push({
      content: insp.base64,
      filename: insp.filename,
      type: insp.contentType || 'application/octet-stream',
      disposition: 'inline',
      content_id: CID_INLINE_INSPIRATION,
    })
    attachmentLabels.push(insp.filename)
  }
  if (hasCurrentBase64 && photoSlots.current?.kind !== 'https') {
    sgAttachments.push({
      content: cur.base64,
      filename: cur.filename,
      type: cur.contentType || 'application/octet-stream',
      disposition: 'inline',
      content_id: CID_INLINE_CURRENT,
    })
    attachmentLabels.push(cur.filename)
  }

  const htmlBody = buildRequestEmailHtml({
    proName,
    serviceTitle,
    clientName,
    clientEmail,
    clientPhone,
    portfolioImageUrl,
    message,
    preferredDate,
    createdAt,
    phoneNumber,
    proEmail,
    attachmentLabels,
    photoSlots,
  })

  const templateId = (process.env.SENDGRID_REQUEST_TEMPLATE_ID ?? '').trim()
  const dynamicTemplateData = buildDynamicTemplateData({
    proName,
    serviceTitle,
    message,
    preferredDate,
    createdAt,
    clientName,
    clientEmail,
    clientPhone,
    portfolioImageUrl,
    phoneNumber,
    proEmail,
    photoSlots,
  })

  const sent = []
  const errors = {}

  if (isSmsEnabled()) {
    if (!twilioClient || !twilioFromNumber || !notifyToPhone) {
      if (!twilioClient) {
        errors.sms =
          'Twilio not configured (missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN).'
      } else if (!twilioFromNumber) {
        errors.sms = 'Missing TWILIO_FROM_NUMBER.'
      } else if (!notifyToPhone) {
        errors.sms = 'Missing NOTIFY_TO_PHONE.'
      }
    } else {
      try {
        const msg = await twilioClient.messages.create({
          from: twilioFromNumber,
          to: notifyToPhone,
          body: textBody,
        })
        sent.push('sms')
        console.log('[notify] SMS queued:', msg.sid, msg.status)
      } catch (error) {
        const detail = formatTwilioError(error)
        errors.sms = detail
        console.error('[notify] Twilio SMS failed:', detail)
      }
    }
  } else {
    console.log('[notify] SMS skipped (set ENABLE_SMS=true to enable Twilio)')
  }

  if (!sendgridApiKey || !notifyToEmail || !sendgridFromEmail) {
    if (!errors.email) {
      if (!sendgridApiKey) {
        errors.email = 'SendGrid not configured (missing SENDGRID_API_KEY).'
      } else if (!sendgridFromEmail) {
        errors.email = 'Missing SENDGRID_FROM_EMAIL.'
      } else if (!notifyToEmail) {
        errors.email = 'Missing NOTIFY_TO_EMAIL.'
      }
    }
  } else {
    try {
      const emailPayload = templateId
        ? {
            to: notifyToEmail,
            from: sendgridFromEmail,
            templateId,
            dynamicTemplateData,
            ...(sgAttachments.length > 0 ? { attachments: sgAttachments } : {}),
          }
        : {
            to: notifyToEmail,
            from: sendgridFromEmail,
            subject: `Trustfall Request: ${serviceTitle}`,
            text: textBody,
            html: htmlBody,
            ...(sgAttachments.length > 0 ? { attachments: sgAttachments } : {}),
          }
      await sgMail.send(emailPayload)
      sent.push('email')
      console.log(
        `[notify] Email sent via SendGrid${templateId ? ` (template ${templateId})` : ''}`,
      )
    } catch (error) {
      const detail = formatSendGridError(error)
      errors.email = detail
      console.error('[notify] SendGrid failed:', detail)
    }
  }

  const hasWork = Object.keys(errors).length > 0 || sent.length > 0
  if (!hasWork) {
    return res.status(200).json({
      ok: true,
      sent: [],
      errors: {},
      message: 'No channels configured. Set NOTIFY and provider env vars.',
    })
  }

  const ok = sent.length > 0
  const statusCode = ok ? 200 : 502
  return res.status(statusCode).json({
    ok,
    sent,
    errors,
    message:
      sent.length === 0
        ? 'All notification channels failed. See errors for details.'
        : Object.keys(errors).length > 0
          ? 'Some channels failed; see errors.'
          : undefined,
  })
})

app.listen(port, () => {
  console.log(`Trustfall notify server running at http://localhost:${port}`)
  console.log(
    isSmsEnabled()
      ? 'SMS: enabled (ENABLE_SMS=true)'
      : 'SMS: off — email only (set ENABLE_SMS=true when Twilio is ready)',
  )
  console.log(`Diagnostics: GET http://localhost:${port}/api/notify-status`)
  if ((process.env.SENDGRID_REQUEST_TEMPLATE_ID ?? '').trim()) {
    console.log(
      'SendGrid: SENDGRID_REQUEST_TEMPLATE_ID set — transactional template + photo HTML block',
    )
  } else {
    console.log(
      'SendGrid: built-in HTML (set SENDGRID_REQUEST_TEMPLATE_ID for Dynamic Templates)',
    )
  }
  const signedConfigured = Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey())
  console.log(
    signedConfigured
      ? 'Supabase: signed URLs for client-uploads (7d) enabled for booking photos'
      : 'Supabase: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for HTTPS images in booking emails (else CID fallback)',
  )
})
