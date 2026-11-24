const numberFormatters = new Map<number, Intl.NumberFormat>()

export function formatNumber(value: string | null | undefined, maximumFractionDigits = 2) {
  if (value == null || value === '') {
    return '—'
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '—'
  }

  let formatter = numberFormatters.get(maximumFractionDigits)
  if (!formatter) {
    formatter = new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits,
    })
    numberFormatters.set(maximumFractionDigits, formatter)
  }

  return formatter.format(numeric)
}

export function formatPercent(value: string | null | undefined, maximumFractionDigits = 2) {
  const formatted = formatNumber(value, maximumFractionDigits)
  return formatted === '—' ? formatted : `${formatted}%`
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—'
  }

  const parts = value.split('-').map(Number)
  if (parts.length !== 3 || parts.some(part => !Number.isInteger(part))) {
    return value
  }

  const [year, month, day] = parts as [number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const currencySymbols: Record<string, string> = { USD: '$', RUB: '₽', KZT: '₸' }
const moscowDateTime = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
})

export function formatMoney(value: string | null | undefined, currency: string | null | undefined, digits = 2) {
  const amount = formatNumber(value, digits)
  if (amount === '—' || !currency) return amount
  return `${amount}\u00a0${currencySymbols[currency] ?? currency}`
}

export function formatMarketTime(value: string | number | null | undefined) {
  if (value == null) return '—'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? `${moscowDateTime.format(date)} МСК` : '—'
}

export function formatSignedMoney(value: string, currency: string, digits = 2) {
  return (Number(value) > 0 ? '+' : '') + formatMoney(value, currency, digits)
}

export function formatSignedPercent(value: string, digits = 2) {
  return (Number(value) > 0 ? '+' : '') + formatPercent(value, digits)
}

export function valueTone(value: string) {
  const number = Number(value)
  return number > 0 ? 'positive' : number < 0 ? 'negative' : ''
}
