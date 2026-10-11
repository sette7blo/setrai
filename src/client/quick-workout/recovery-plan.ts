import type { QuickWorkout } from './types.js'

export function swapRecoveryExercise(workout: QuickWorkout, index: number): QuickWorkout {
  const current = workout.exercises[index]
  const muscle = current?.muscleGroup ?? ''
  const alternatives = workout.pool?.[muscle] ?? []
  if (!current || !alternatives.length) return workout
  return {
    ...workout,
    exercises: workout.exercises.map((item, position) => position === index ? alternatives[0] : item),
    pool: { ...workout.pool, [muscle]: [...alternatives.slice(1), current] }
  }
}

export function removeRecoveryExercise(workout: QuickWorkout, index: number): QuickWorkout {
  const current = workout.exercises[index]
  if (!current) return workout
  const muscle = current.muscleGroup ?? ''
  const exercises = workout.exercises.filter((_item, position) => position !== index)
  return {
    ...workout, exercises,
    estimatedDurationMinutes: exercises.length * 9,
    pool: { ...workout.pool, [muscle]: [...(workout.pool?.[muscle] ?? []), current] }
  }
}
