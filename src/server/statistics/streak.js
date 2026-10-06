// src/server/statistics/streak.js

import {
  addDays,
  formatDate,
  parseSetraiDateTime,
  startOfIsoWeek,
  weekStartKey
} from './dates.js'

export function calculateTrainingStreak(sessions, now = new Date()) {
  const completedWeeks = new Set(
    sessions
      .map((session) => parseSetraiDateTime(session.finishedAt))
      .filter(Boolean)
      .map(weekStartKey)
  )

  if (completedWeeks.size === 0) {
    return {
      currentStreakWeeks: 0,
      longestStreakWeeks: 0
    }
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
    currentStreakWeeks: current,
    longestStreakWeeks: longest
  }
}
