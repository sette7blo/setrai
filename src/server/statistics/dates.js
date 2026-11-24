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

const dayFormatters = new Map()

// The calendar day ('YYYY-MM-DD') an instant falls on in the training time
// zone. Stored times stay UTC; only this bucketing uses the zone.
export function dayKey(date, timeZone = 'UTC') {
  let formatter = dayFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    dayFormatters.set(timeZone, formatter)
  }
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

// Calendar arithmetic on day keys is done in UTC, where every day has 24
// hours, so DST changes in the training zone cannot shift a key.
export function addDaysToKey(key, days) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, DATE_ONLY_LENGTH)
}

// Monday of the week containing a day key.
export function weekOfDayKey(key) {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay() || 7
  return addDaysToKey(key, 1 - weekday)
}

export function weekStartKey(date, timeZone = 'UTC') {
  return weekOfDayKey(dayKey(date, timeZone))
}
