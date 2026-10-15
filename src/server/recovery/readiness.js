// Public recovery contract for grouping exercise metadata and workout readiness.
import taxonomy from '../../shared/exercise-taxonomy.json' with { type: 'json' }
import { normalizeMuscle } from './muscle-map.js'

const groupByMuscle = new Map()

for (const option of taxonomy.primaryMuscles) {
  groupByMuscle.set(option.value, option.value)
}
for (const option of taxonomy.secondaryMuscles) {
  groupByMuscle.set(option.value, option.recoveryGroup)
}
for (const [alias, target] of Object.entries(taxonomy.aliases.primaryMuscles)) {
  groupByMuscle.set(alias, target)
}
for (const [alias, target] of Object.entries(taxonomy.aliases.secondaryMuscles)) {
  const group = groupByMuscle.get(target)
  if (group) groupByMuscle.set(alias, group)
}

export function recoveryMuscleGroup(value) {
  return groupByMuscle.get(normalizeMuscle(value)) ?? ''
}

export function workoutReadiness(recovery) {
  const readiness = new Map()
  for (const item of recovery.muscles) {
    const group = recoveryMuscleGroup(item.muscle)
    if (group) readiness.set(group, Math.min(readiness.get(group) ?? 1, item.recovery))
  }
  return readiness
}
