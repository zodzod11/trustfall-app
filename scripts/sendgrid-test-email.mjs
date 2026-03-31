import fs from 'node:fs'
import path from 'node:path'
import sgMail from '@sendgrid/mail'

const projectRoot = process.cwd()
const envFilePath = path.join(projectRoot, 'sendgrid.env')

// Load SENDGRID_API_KEY from sendgrid.env when present.
if (!process.env.SENDGRID_API_KEY && fs.existsSync(envFilePath)) {
  const raw = fs.readFileSync(envFilePath, 'utf8')
  const line = raw
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith('SENDGRID_API_KEY='))
  if (line) {
    const value = line.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '')
    if (value) {
      process.env.SENDGRID_API_KEY = value
    }
  }
}

const apiKey = process.env.SENDGRID_API_KEY
const to = process.env.SENDGRID_TEST_TO
const from = process.env.SENDGRID_FROM_EMAIL
const region = process.env.SENDGRID_REGION

if (!apiKey) {
  throw new Error(
    'Missing SENDGRID_API_KEY. Set it in environment or sendgrid.env.',
  )
}

if (!to) {
  throw new Error('Missing SENDGRID_TEST_TO in environment.')
}

if (!from) {
  throw new Error('Missing SENDGRID_FROM_EMAIL in environment.')
}

sgMail.setApiKey(apiKey)

// Optional: only needed when using a regional EU subuser.
if (region?.toLowerCase() === 'eu') {
  sgMail.setDataResidency('eu')
}

const msg = {
  to,
  from,
  subject: 'Trustfall SendGrid Test',
  text: 'SendGrid test from Trustfall local script.',
  html: '<strong>SendGrid test from Trustfall local script.</strong>',
}

sgMail
  .send(msg)
  .then(() => {
    console.log(`Email sent to ${to}`)
  })
  .catch((error) => {
    console.error('SendGrid send failed:')
    console.error(error)
    process.exitCode = 1
  })
