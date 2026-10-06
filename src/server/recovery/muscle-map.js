// src/server/recovery/muscle-map.js

const MUSCLE_ALIASES = new Map([
  ['front delts', 'anterior-deltoid'],
  ['front-delts', 'anterior-deltoid'],
  ['anterior deltoid', 'anterior-deltoid'],
  ['pecs', 'chest'],
  ['pectorals', 'chest'],
  ['quads', 'quadriceps'],
  ['quad', 'quadriceps'],
  ['lats', 'back'],
  ['latissimus-dorsi', 'back']
])

export function normalizeMuscle(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')

  return MUSCLE_ALIASES.get(normalized) ?? normalized
}

export function getExerciseMuscles(exercise) {
  if (!exercise) {
    return []
  }

  const muscles = []

  if (exercise.muscle_group) {
    muscles.push(exercise.muscle_group)
  }

  if (Array.isArray(exercise.muscles)) {
    muscles.push(...exercise.muscles)
  }

  const normalized = muscles
    .map(normalizeMuscle)
    .filter(Boolean)

  return [...new Set(normalized)].sort((a, b) =>
    a.localeCompare(b)
  )
}
