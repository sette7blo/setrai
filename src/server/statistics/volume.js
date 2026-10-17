import {
  parseSetraiDateTime,
  weekStartKey
} from './dates.js'

function isVolumeSet(set) {
  return set.done &&
    Number.isFinite(Number(set.weight)) &&
    Number.isFinite(Number(set.reps)) &&
    Number(set.weight) > 0 &&
    Number(set.reps) > 0
}

function setVolume(set) {
  return Number(set.weight) * Number(set.reps)
}

export function getVolumeSets(sessions) {
  return sessions.flatMap((session) =>
    session.sets
      .filter(isVolumeSet)
      .map((set) => ({
        session,
        set,
        volume: setVolume(set)
      }))
  )
}

export function calculateTotalVolume(volumeSets) {
  return volumeSets.reduce(
    (total, item) => total + item.volume,
    0
  )
}

export function calculateWeeklyVolume(volumeSets) {
  const weeks = new Map()

  for (const item of volumeSets) {
    const completedAt = parseSetraiDateTime(
      item.session.finishedAt
    )

    if (!completedAt) {
      continue
    }

    const key = weekStartKey(completedAt)
    weeks.set(key, (weeks.get(key) ?? 0) + item.volume)
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, volume]) => ({
      weekStart,
      volume
    }))
}

export function calculateVolumeByExercise(volumeSets) {
  const exercises = new Map()

  for (const { set, volume } of volumeSets) {
    const key = set.exerciseSlug || `exercise-${set.exerciseId}`
    const existing = exercises.get(key) ?? {
      exerciseSlug: set.exerciseSlug,
      exerciseName: set.exerciseName,
      volume: 0
    }

    existing.volume += volume
    exercises.set(key, existing)
  }

  return [...exercises.values()]
    .sort((a, b) =>
      a.exerciseName.localeCompare(b.exerciseName) ||
      a.exerciseSlug.localeCompare(b.exerciseSlug)
    )
}

export function calculateVolumeByMuscle(volumeSets, exerciseService) {
  const muscles = new Map()

  for (const { set, volume } of volumeSets) {
    const exercise = exerciseService.getExercise(set.exerciseId)
    const muscle = exercise?.muscle_group || 'unknown'
    muscles.set(muscle, (muscles.get(muscle) ?? 0) + volume)
  }

  return [...muscles.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([muscle, volume]) => ({
      muscle,
      volume
    }))
}
