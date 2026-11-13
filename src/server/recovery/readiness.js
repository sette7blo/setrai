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

const RECOVERY_GROUPS = taxonomy.primaryMuscles.map((option) => option.value)

export function workoutReadiness(recovery) {
  const readiness = new Map()
  for (const item of recovery.muscles) {
    const group = recoveryMuscleGroup(item.muscle)
    if (group) readiness.set(group, Math.min(readiness.get(group) ?? 1, item.recovery))
  }
  return readiness
}

// Mean readiness across the ten Recovery groups as a whole percent. A group
// with no training in the lookback window counts as fully recovered.
export function overallReadiness(recovery) {
  const byGroup = workoutReadiness(recovery)
  const total = RECOVERY_GROUPS.reduce(
    (sum, group) => sum + (byGroup.get(group) ?? 1),
    0
  )
  return Math.round((total / RECOVERY_GROUPS.length) * 100)
}
