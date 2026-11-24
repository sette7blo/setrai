import {
  addDaysToKey,
  dayKey,
  parseSetraiDateTime,
  weekOfDayKey
} from './dates.js'

// Counts back from the current period while each earlier one has a session.
// A streak is still alive while its period is open: before today's or this
// week's first session, counting starts at the previous day or week.
function currentRun(keys, current, step) {
  let cursor = keys.has(current) ? current : addDaysToKey(current, -step)
  let run = 0
  while (keys.has(cursor)) {
    run += 1
    cursor = addDaysToKey(cursor, -step)
  }
  return run
}

function longestRun(keys, step) {
  let longest = 0
  let run = 0
  let previous = null
  for (const key of [...keys].sort()) {
    run = previous && addDaysToKey(previous, step) === key ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = key
  }
  return longest
}

export function calculateTrainingStreak(sessions, now = new Date(), timeZone = 'UTC') {
  const completedDays = new Set(
    sessions
      .map((session) => parseSetraiDateTime(session.finishedAt))
      .filter(Boolean)
      .map((finishedAt) => dayKey(finishedAt, timeZone))
  )
  const completedWeeks = new Set([...completedDays].map(weekOfDayKey))

  if (completedWeeks.size === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      currentStreakWeeks: 0,
      longestStreakWeeks: 0
    }
  }

  const today = dayKey(now, timeZone)
  return {
    currentStreakDays: currentRun(completedDays, today, 1),
    longestStreakDays: longestRun(completedDays, 1),
    currentStreakWeeks: currentRun(completedWeeks, weekOfDayKey(today), 7),
    longestStreakWeeks: longestRun(completedWeeks, 7)
  }
}
