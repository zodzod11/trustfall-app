import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import twilio from 'twilio'
import sgMail from '@sendgrid/mail'

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

/** Fixed CIDs for inline uploads — template HTML can use <img src="cid:tf-inspiration" /> etc. */
const CID_INLINE_INSPIRATION = 'tf-inspiration'
const CID_INLINE_CURRENT = 'tf-current'

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
    inspirationImageName,
    currentPhotoName,
    createdAt,
    phoneNumber,
    proEmail,
    attachmentLabels,
    showInspirationInline,
    showCurrentInline,
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
    ['Inspiration (filename)', escapeHtml(inspirationImageName || '—')],
    ['Current photo (filename)', escapeHtml(currentPhotoName || '—')],
    ['Created', escapeHtml(createdAt || new Date().toISOString())],
  ]

  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;font-size:13px;color:#555;width:140px;vertical-align:top;">${k}</td><td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;font-size:14px;color:#111;vertical-align:top;">${v}</td></tr>`,
    )
    .join('')

  const msgBlock = `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#222;">${escapeHtml(
    message || '(empty)',
  ).replace(/\n/g, '<br/>')}</p>`

  const attachNote =
    attachmentLabels.length > 0
      ? `<p style="margin:16px 0 0;font-size:13px;color:#444;"><strong>Files included:</strong> ${escapeHtml(
          attachmentLabels.join(', '),
        )} (inline below where supported)</p>`
      : ''

  const uploadsBlock =
    showInspirationInline || showCurrentInline
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid #e8e8e8;border-radius:10px;overflow:hidden;">
          <tr>
            <td colspan="2" style="padding:10px 14px;background:#f8f8f9;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#666;">Client photos</td>
          </tr>
          ${
            showInspirationInline
              ? `<tr>
            <td style="padding:14px 14px 8px;font-size:13px;color:#555;vertical-align:top;width:120px;">Inspiration</td>
            <td style="padding:8px 14px 14px;">
              <img src="cid:${CID_INLINE_INSPIRATION}" alt="${escapeHtml(
                  inspirationImageName || 'Inspiration',
                )}" width="400" style="display:block;max-width:100%;height:auto;border-radius:8px;border:1px solid #eee;" />
            </td>
          </tr>`
              : ''
          }
          ${
            showCurrentInline
              ? `<tr>
            <td style="padding:14px 14px 8px;font-size:13px;color:#555;vertical-align:top;width:120px;">Current look</td>
            <td style="padding:8px 14px 14px;">
              <img src="cid:${CID_INLINE_CURRENT}" alt="${escapeHtml(
                  currentPhotoName || 'Current photo',
                )}" width="400" style="display:block;max-width:100%;height:auto;border-radius:8px;border:1px solid #eee;" />
            </td>
          </tr>`
              : ''
          }
        </table>`
      : ''

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
              ${attachNote}
              ${uploadsBlock}
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

/** Data for SendGrid Dynamic Templates — use {{pro_name}}, {{show_inspiration}}, <img src="cid:tf-inspiration" />, etc. */
function buildDynamicTemplateData(payload) {
  const {
    proName,
    serviceTitle,
    message,
    preferredDate,
    inspirationImageName,
    currentPhotoName,
    createdAt,
    clientName,
    clientEmail,
    clientPhone,
    portfolioImageUrl,
    phoneNumber,
    proEmail,
    hasInspiration,
    hasCurrent,
  } = payload

  const safeUrl = safeHttpImageUrl(portfolioImageUrl) || ''
  return {
    subject: `Trustfall Request: ${serviceTitle}`,
    pro_name: proName,
    service_title: serviceTitle,
    message,
    text_body: message || '',
    preferred_date: preferredDate || '',
    inspiration_filename: inspirationImageName || '',
    current_photo_filename: currentPhotoName || '',
    created_at: createdAt || new Date().toISOString(),
    client_name: clientName || '',
    client_email: clientEmail || '',
    client_phone: clientPhone || '',
    pro_phone: phoneNumber || '',
    pro_email: proEmail || '',
    portfolio_image_url: safeUrl,
    show_inspiration: hasInspiration,
    show_current: hasCurrent,
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
  })
})

app.post('/api/notify-request', async (req, res) => {
  const notifyToPhone = process.env.NOTIFY_TO_PHONE
  const notifyToEmail = process.env.NOTIFY_TO_EMAIL
  const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL

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
  } = req.body ?? {}

  const textBody = [
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
    `Inspiration file: ${inspirationImageName || 'None'}`,
    `Current photo file: ${currentPhotoName || 'None'}`,
    `Created: ${createdAt || new Date().toISOString()}`,
  ].join('\n')

  const sgAttachments = []
  const attachmentLabels = []
  const insp = attachmentPayload?.inspiration
  const cur = attachmentPayload?.current
  const hasInspiration = Boolean(insp?.base64 && insp?.filename)
  const hasCurrent = Boolean(cur?.base64 && cur?.filename)

  // SendGrid v3 expects snake_case `content_id` for inline parts. The @sendgrid/helpers
  // Mail serializer does not rewrite keys inside the attachments array, so `contentId`
  // was sent through and the API rejected it.
  if (hasInspiration) {
    sgAttachments.push({
      content: insp.base64,
      filename: insp.filename,
      type: insp.contentType || 'application/octet-stream',
      disposition: 'inline',
      content_id: CID_INLINE_INSPIRATION,
    })
    attachmentLabels.push(insp.filename)
  }
  if (hasCurrent) {
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
    inspirationImageName,
    currentPhotoName,
    createdAt,
    phoneNumber,
    proEmail,
    attachmentLabels,
    showInspirationInline: hasInspiration,
    showCurrentInline: hasCurrent,
  })

  const templateId = (process.env.SENDGRID_REQUEST_TEMPLATE_ID ?? '').trim()
  const dynamicTemplateData = buildDynamicTemplateData({
    proName,
    serviceTitle,
    message,
    preferredDate,
    inspirationImageName,
    currentPhotoName,
    createdAt,
    clientName,
    clientEmail,
    clientPhone,
    portfolioImageUrl,
    phoneNumber,
    proEmail,
    hasInspiration,
    hasCurrent,
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
      'SendGrid: SENDGRID_REQUEST_TEMPLATE_ID set — transactional template + inline CID attachments',
    )
  } else {
    console.log(
      'SendGrid: built-in HTML (set SENDGRID_REQUEST_TEMPLATE_ID for Dynamic Templates)',
    )
  }
})
