import fs from 'node:fs'
import path from 'node:path'
import twilio from 'twilio'

const projectRoot = process.cwd()

function loadEnvFile(fileName) {
  const envFilePath = path.join(projectRoot, fileName)
  if (!fs.existsSync(envFilePath)) return
  const raw = fs.readFileSync(envFilePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile('notifications.local')
loadEnvFile('sendgrid.env')

const sid = process.env.TWILIO_ACCOUNT_SID
const token = process.env.TWILIO_AUTH_TOKEN
const from = process.env.TWILIO_FROM_NUMBER
const to = process.env.NOTIFY_TO_PHONE

if (!sid || !token) {
  console.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in notifications.local')
  process.exit(1)
}
if (!from || !to) {
  console.error('Missing TWILIO_FROM_NUMBER or NOTIFY_TO_PHONE in notifications.local')
  process.exit(1)
}

const client = twilio(sid, token)

client.messages
  .create({
    from,
    to,
    body: 'Trustfall Twilio SMS test. If you see this, SMS is working.',
  })
  .then((message) => {
    console.log('SMS sent. SID:', message.sid)
    console.log('Status:', message.status)
  })
  .catch((err) => {
    console.error('Twilio error:')
    console.error('  Message:', err.message)
    if (err.code) console.error('  Code:', err.code)
    if (err.moreInfo) console.error('  More info:', err.moreInfo)
    process.exit(1)
  })
