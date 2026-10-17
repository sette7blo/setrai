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

export const PRIMARY_MUSCLE_LOAD = 1
export const SECONDARY_MUSCLE_LOAD = 0.5

export function getExerciseMuscleLoads(exercise) {
  if (!exercise) return []

  const loads = new Map()
  const add = (value, factor) => {
    const muscle = normalizeMuscle(value)
    if (muscle) loads.set(muscle, Math.max(loads.get(muscle) ?? 0, factor))
  }

  if (exercise.muscle_group) add(exercise.muscle_group, PRIMARY_MUSCLE_LOAD)
  if (Array.isArray(exercise.muscles)) {
    for (const muscle of exercise.muscles) add(muscle, SECONDARY_MUSCLE_LOAD)
  }

  return [...loads.entries()]
    .map(([muscle, factor]) => ({ muscle, factor }))
    .sort((a, b) => a.muscle.localeCompare(b.muscle))
}

export function getExerciseMuscles(exercise) {
  return getExerciseMuscleLoads(exercise).map(load => load.muscle)
}
