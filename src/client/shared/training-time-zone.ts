// The time zone that decides which day and week a workout belongs to. It is
// the profile's timeZone (set from the browser on first load), so History,
// Today and the server's statistics bucket workouts the same way.

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

let activeTimeZone = browserTimeZone()

export function detectedTimeZone(): string {
  return browserTimeZone()
}

export function setTrainingTimeZone(zone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    activeTimeZone = zone
  } catch {
    // Keep the current zone when the stored one is unknown to this browser.
  }
}

export function trainingTimeZone(): string {
  return activeTimeZone
}

// 'YYYY-MM-DD' of an instant in the training time zone.
export function trainingDayKey(date: Date, zone = activeTimeZone): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

// Monday of the week containing a day key, computed on the calendar date.
export function weekStartOfDayKey(key: string): string {
  const date = new Date(`${key}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() || 7) - 1))
  return date.toISOString().slice(0, 10)
}
