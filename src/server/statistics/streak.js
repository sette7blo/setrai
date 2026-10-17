import {
  addDays,
  formatDate,
  parseSetraiDateTime,
  startOfIsoWeek,
  weekStartKey
} from './dates.js'

export function calculateTrainingStreak(sessions, now = new Date()) {
  const completedDays = new Set(
    sessions
      .map((session) => parseSetraiDateTime(session.finishedAt))
      .filter(Boolean)
      .map(formatDate)
  )
  const completedWeeks = new Set(
    sessions
      .map((session) => parseSetraiDateTime(session.finishedAt))
      .filter(Boolean)
      .map(weekStartKey)
  )

  if (completedWeeks.size === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      currentStreakWeeks: 0,
      longestStreakWeeks: 0
    }
  }

  let currentDayStreak = 0
  let dayCursor = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ))

  while (completedDays.has(formatDate(dayCursor))) {
    currentDayStreak += 1
    dayCursor = addDays(dayCursor, -1)
  }

  const orderedDays = [...completedDays].sort()
  let longestDayStreak = 0
  let dayRun = 0
  let previousDay = null

  for (const day of orderedDays) {
    const currentDay = parseSetraiDateTime(day)

    if (
      previousDay &&
      formatDate(addDays(previousDay, 1)) !== day
    ) {
      dayRun = 0
    }

    dayRun += 1
    longestDayStreak = Math.max(longestDayStreak, dayRun)
    previousDay = currentDay
  }

  let current = 0
  let cursor = startOfIsoWeek(now)

  while (completedWeeks.has(formatDate(cursor))) {
    current += 1
    cursor = addDays(cursor, -7)
  }

  const orderedWeeks = [...completedWeeks].sort()
  let longest = 0
  let run = 0
  let previous = null

  for (const week of orderedWeeks) {
    const currentWeek = parseSetraiDateTime(week)

    if (
      previous &&
      formatDate(addDays(previous, 7)) !== week
    ) {
      run = 0
    }

    run += 1
    longest = Math.max(longest, run)
    previous = currentWeek
  }

  return {
    currentStreakDays: currentDayStreak,
    longestStreakDays: longestDayStreak,
    currentStreakWeeks: current,
    longestStreakWeeks: longest
  }
}
