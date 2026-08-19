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
