// src/server/statistics/dates.js

const DATE_ONLY_LENGTH = 10
const DAY_MS = 24 * 60 * 60 * 1000

export function parseSetraiDateTime(value) {
  if (!value) {
    return null
  }

  const isoValue = value.length === DATE_ONLY_LENGTH
    ? `${value}T00:00:00.000Z`
    : value.includes('T')
      ? value
      : `${value.replace(' ', 'T')}Z`
  const parsed = new Date(isoValue)

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed
}

export function formatDate(date) {
  return date.toISOString().slice(0, DATE_ONLY_LENGTH)
}

export function startOfIsoWeek(value) {
  const date = new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate()
  ))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - day + 1)
  return date
}

export function weekStartKey(value) {
  return formatDate(startOfIsoWeek(value))
}

export function addDays(value, days) {
  return new Date(value.getTime() + days * DAY_MS)
}
