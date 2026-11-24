import {
  estimateOneRepMax,
  roundMetric
} from './one-rep-max.js'

function oneRepMax(set) {
  const value = estimateOneRepMax(Number(set.weight), Number(set.reps))
  return value === null ? null : roundMetric(value)
}

// Heaviest set (more reps breaks a tie); without any load, the longest timed
// set or the set with the most reps.
function topSet(sets) {
  const rank = (set) => [Number(set.weight) || 0, set.durationSec ?? 0, Number(set.reps) || 0]
  return sets.reduce((best, set) => {
    const [a, b] = [rank(set), rank(best)]
    return a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]))) ? set : best
  })
}

function publicSet(set) {
  return { setNumber: set.setNumber, reps: set.reps, weight: set.weight, durationSec: set.durationSec ?? null }
}

// Sessions arrive newest first, so a tie moves the record to the older date:
// the day it was first reached.
function better(current, value, date, extra = {}) {
  return value > 0 && (!current || value >= current.value) ? { value, date, ...extra } : current
}

// sets: done sets of one exercise from finished sessions, newest session first.
export function calculateExerciseProgress(sets) {
  const sessions = []
  const bySession = new Map()
  for (const set of sets) {
    let session = bySession.get(set.sessionId)
    if (!session) {
      session = { sessionId: set.sessionId, finishedAt: set.sessionFinishedAt, sets: [] }
      bySession.set(set.sessionId, session)
      sessions.push(session)
    }
    session.sets.push(set)
  }

  let heaviestWeight = null
  let estimated1RM = null
  let mostReps = null
  let longestDurationSec = null
  const rows = sessions.map((session) => {
    const estimates = session.sets.map(oneRepMax).filter((value) => value !== null)
    const volume = session.sets.reduce((total, set) => total + (Number(set.weight) > 0 && Number(set.reps) > 0 ? Number(set.weight) * Number(set.reps) : 0), 0)
    for (const set of session.sets) {
      heaviestWeight = better(heaviestWeight, Number(set.weight) || 0, session.finishedAt, { reps: set.reps })
      estimated1RM = better(estimated1RM, oneRepMax(set) ?? 0, session.finishedAt, { weight: set.weight, reps: set.reps })
      mostReps = better(mostReps, Number(set.reps) || 0, session.finishedAt, { weight: set.weight })
      longestDurationSec = better(longestDurationSec, set.durationSec ?? 0, session.finishedAt)
    }
    return {
      sessionId: session.sessionId,
      finishedAt: session.finishedAt,
      sets: session.sets.map(publicSet),
      topSet: publicSet(topSet(session.sets)),
      bestEstimated1RM: estimates.length ? Math.max(...estimates) : null,
      volume: roundMetric(volume)
    }
  })

  return { sessions: rows, best: { heaviestWeight, estimated1RM, mostReps, longestDurationSec } }
}
