// src/server/recovery/calculator.js

import {
  getExerciseMuscleLoads
} from './muscle-map.js'

const HOUR_MS = 60 * 60 * 1000
const BASE_RECOVERY_HOURS = 48
const LOOKBACK_DAYS = 7

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

function stimulusForSet(set) {
  if (!set.done) {
    return 0
  }

  const reps = Number(set.reps)
  const weight = Number(set.weight)
  const repFactor = Number.isFinite(reps) && reps > 0
    ? Math.min(reps, 20) / 20
    : 0
  const weightFactor = Number.isFinite(weight) && weight > 0
    ? Math.min(weight, 200) / 200
    : 0

  return 1 + repFactor * 0.5 + weightFactor * 0.5
}

function addMuscleLoad(loads, muscle, finishedAt, stimulus) {
  const current = loads.get(muscle) ?? {
    muscle,
    stimulus: 0,
    lastTrainedAt: null
  }

  current.stimulus += stimulus

  if (
    !current.lastTrainedAt ||
    finishedAt > current.lastTrainedAt
  ) {
    current.lastTrainedAt = finishedAt
  }

  loads.set(muscle, current)
}

function recoveryForLoad(load, now) {
  const elapsedHours = Math.max(
    0,
    (now.getTime() - load.lastTrainedAt.getTime()) / HOUR_MS
  )
  // Explainable v1 model:
  // completed sets add normalized stimulus; accumulated stimulus extends a
  // 48-hour baseline recovery window; readiness linearly increases over time.
  const effectiveHours = BASE_RECOVERY_HOURS *
    (1 + load.stimulus / 4)

  return roundRecovery(elapsedHours / effectiveHours)
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
  const loads = new Map()

  for (const session of sessions) {
    const finishedAt = parseSetraiDateTime(session.finishedAt)

    if (!finishedAt || finishedAt < cutoff) {
      continue
    }

    for (const set of session.sets ?? []) {
      const stimulus = stimulusForSet(set)

      if (stimulus <= 0) {
        continue
      }

      const exercise = exerciseService.getExercise(set.exerciseId)
      const muscleLoads = getExerciseMuscleLoads(exercise)

      for (const { muscle, factor } of muscleLoads) {
        addMuscleLoad(loads, muscle, finishedAt, stimulus * factor)
      }
    }
  }

  return [...loads.values()]
    .map((load) => {
      const recovery = recoveryForLoad(load, now)
      return {
        muscle: load.muscle,
        recovery,
        status: statusForRecovery(recovery),
        lastTrainedAt: load.lastTrainedAt.toISOString()
      }
    })
    .sort((a, b) => a.muscle.localeCompare(b.muscle))
}

export {
  BASE_RECOVERY_HOURS,
  LOOKBACK_DAYS,
  statusForRecovery,
  stimulusForSet
}
