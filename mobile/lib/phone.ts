const US_PHONE_DIGITS = 10
const US_PHONE_WITH_COUNTRY_DIGITS = 11

function formatLocalPhoneDigits(digits: string): string {
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

export function formatPhoneNumber(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''

  if (digits.length <= US_PHONE_DIGITS) {
    return formatLocalPhoneDigits(digits)
  }

  if (digits.length <= US_PHONE_WITH_COUNTRY_DIGITS && digits.startsWith('1')) {
    const localDigits = digits.slice(1)
    return localDigits ? `1-${formatLocalPhoneDigits(localDigits)}` : '1'
  }

  return trimmed
}

export function toDialablePhoneNumber(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return trimmed

  return trimmed.startsWith('+') ? `+${digits}` : digits
}
