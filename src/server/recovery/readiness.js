// Public recovery contract for grouping exercise metadata and workout readiness.
import { normalizeMuscle } from './muscle-map.js'

const GROUPS = {
  chest: ['chest', 'pecs', 'pectorals', 'upper-chest'],
  back: ['back', 'lats', 'latissimus-dorsi', 'upper-back', 'mid-back', 'middle-back', 'lower-back', 'lumbar', 'erector-spinae', 'traps', 'trapezius'],
  shoulders: ['shoulders', 'shoulder', 'deltoids', 'deltoid', 'delts', 'front-delts', 'anterior-deltoid', 'lateral-deltoid', 'posterior-deltoid'],
  biceps: ['biceps', 'bicep', 'brachialis', 'forearms', 'forearm', 'arms'],
  triceps: ['triceps', 'tricep'],
  core: ['core', 'abs', 'abdominals', 'obliques', 'full-body'],
  quadriceps: ['quadriceps', 'quads', 'quad', 'legs'],
  hamstrings: ['hamstrings', 'hamstring', 'hams'],
  glutes: ['glutes', 'glute', 'gluteus-maximus'],
  calves: ['calves', 'calf']
}
const aliases = new Map(Object.entries(GROUPS).flatMap(([group, names]) => names.map(name => [name, group])))

export function recoveryMuscleGroup(value) {
  return aliases.get(normalizeMuscle(value)) ?? ''
}

export function workoutReadiness(recovery) {
  const readiness = new Map()
  for (const item of recovery.muscles) {
    const group = recoveryMuscleGroup(item.muscle)
    if (group) readiness.set(group, Math.min(readiness.get(group) ?? 1, item.recovery))
  }
  return readiness
}
