import {
  getExerciseMuscleLoads
} from './muscle-map.js'

const HOUR_MS = 60 * 60 * 1000
const MIN_RECOVERY_HOURS = 24
const VOLUME_RECOVERY_HOURS = 48
const MAX_RECOVERY_HOURS = 96
// Session volume (in set-equivalents) at which ~63% of the volume window is used.
const VOLUME_SCALE = 6
// Share of leftover fatigue that stretches the next session's recovery window.
const RESIDUAL_CARRY = 0.5
const LOOKBACK_DAYS = 7
const CATEGORY_LOAD = new Map([
  ['stretching', 0],
  ['cardio', 0.5]
])

function parseSetraiDateTime(value) {
  if (!value) {
    return null
  }

  const isoValue = value.length === 10
    ? `${value}T00:00:00.000Z`
    : value.includes('T')
      ? value
      : `${value.replace(' ', 'T')}Z`
  const parsed = new Date(isoValue)

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed
}

function clamp(value) {
  return Math.min(1, Math.max(0, value))
}

function roundRecovery(value) {
  return Number(clamp(value).toFixed(2))
}

function statusForRecovery(recovery) {
  if (recovery < 0.4) {
    return 'recovering'
  }

  if (recovery < 0.8) {
    return 'moderate'
  }

  return 'ready'
}

function stimulusForSet(set, exercise = null) {
  if (!set.done) {
    return 0
  }

  const categoryLoad = CATEGORY_LOAD.get(exercise?.category) ?? 1
  const reps = Number(set.reps)
  const weight = Number(set.weight)
  const repFactor = Number.isFinite(reps) && reps > 0
    ? Math.min(reps, 20) / 20
    : 0
  const weightFactor = Number.isFinite(weight) && weight > 0
    ? Math.min(weight, 100) / 100
    : 0

  return categoryLoad * (1 + repFactor * 0.25 + weightFactor * 0.25)
}

function windowForVolume(volume) {
  return MIN_RECOVERY_HOURS +
    VOLUME_RECOVERY_HOURS * (1 - Math.exp(-volume / VOLUME_SCALE))
}

function hoursBetween(start, end) {
  return Math.max(0, (end.getTime() - start.getTime()) / HOUR_MS)
}

// Explainable model: each session's volume per muscle sets a 24-72h recovery
// window with diminishing returns. Readiness rises linearly from the latest
// session. Training a muscle that has not fully recovered stretches the new
// window by part of the fatigue still left over, capped at 96h.
function recoveryForMuscle(sessions, now) {
  let window = 0
  let startedAt = null

  for (const { finishedAt, volume } of sessions) {
    const residual = startedAt
      ? Math.max(0, 1 - hoursBetween(startedAt, finishedAt) / window)
      : 0
    window = Math.min(
      MAX_RECOVERY_HOURS,
      windowForVolume(volume) * (1 + residual * RESIDUAL_CARRY)
    )
    startedAt = finishedAt
  }

  return {
    lastTrainedAt: startedAt,
    recovery: roundRecovery(hoursBetween(startedAt, now) / window)
  }
}

export function calculateRecovery({
  sessions,
  exerciseService,
  now = new Date(),
  lookbackDays = LOOKBACK_DAYS
}) {
  const cutoff = new Date(
    now.getTime() - lookbackDays * 24 * HOUR_MS
  )
  const volumes = new Map()

  for (const session of sessions) {
    const finishedAt = parseSetraiDateTime(session.finishedAt)

    if (!finishedAt || finishedAt < cutoff) {
      continue
    }

    const sessionVolume = new Map()

    for (const set of session.sets ?? []) {
      const exercise = exerciseService.getExercise(set.exerciseId)
      const stimulus = stimulusForSet(set, exercise)

      if (stimulus <= 0) {
        continue
      }

      for (const { muscle, factor } of getExerciseMuscleLoads(exercise)) {
        sessionVolume.set(
          muscle,
          (sessionVolume.get(muscle) ?? 0) + stimulus * factor
        )
      }
    }

    for (const [muscle, volume] of sessionVolume) {
      const history = volumes.get(muscle) ?? []
      history.push({ finishedAt, volume })
      volumes.set(muscle, history)
    }
  }

  return [...volumes.entries()]
    .map(([muscle, history]) => {
      history.sort((a, b) => a.finishedAt - b.finishedAt)
      const { recovery, lastTrainedAt } = recoveryForMuscle(history, now)
      return {
        muscle,
        recovery,
        status: statusForRecovery(recovery),
        lastTrainedAt: lastTrainedAt.toISOString()
      }
    })
    .sort((a, b) => a.muscle.localeCompare(b.muscle))
}

export {
  LOOKBACK_DAYS,
  MAX_RECOVERY_HOURS,
  MIN_RECOVERY_HOURS,
  statusForRecovery,
  stimulusForSet,
  windowForVolume
}
