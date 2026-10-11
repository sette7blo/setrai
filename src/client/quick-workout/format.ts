import { displayName } from '../exercises/format.js'
import type { QuickWorkout, QuickWorkoutApiPayload, QuickWorkoutExercise, QuickWorkoutExerciseApiPayload, RecoveryFallback } from './types.js'

export const DURATION_CHOICES = [15, 30, 45, 60]
export const MIN_DURATION = 15
export const MAX_DURATION = 90

export function normalizeQuickWorkoutExercise(payload: QuickWorkoutExerciseApiPayload): QuickWorkoutExercise {
  return {
    ...(payload.muscleGroup ? { muscleGroup: payload.muscleGroup } : {}),
    exerciseId: Number(payload.exerciseId ?? payload.exercise_id ?? 0),
    exerciseSlug: payload.exerciseSlug ?? payload.exercise_slug ?? '',
    exerciseName: payload.exerciseName ?? payload.exercise_name ?? displayName(payload.exerciseSlug ?? payload.exercise_slug ?? ''),
    sets: Number(payload.sets ?? 3),
    reps: String(payload.reps ?? '8-12'),
    restSec: Number(payload.restSec ?? payload.restSeconds ?? payload.rest_sec ?? 90)
  }
}

export function normalizeQuickWorkout(payload: QuickWorkoutApiPayload): QuickWorkout {
  return {
    pool: Object.fromEntries(Object.entries(payload.pool ?? {}).map(([muscle, items]) => [muscle, items.map(normalizeQuickWorkoutExercise)])),
    estimatedDurationMinutes: payload.estimatedDurationMinutes ?? (payload.exercises ?? []).length * 9,
    name: payload.name || 'Quick Workout',
    durationMinutes: Number(payload.durationMinutes ?? payload.duration_minutes ?? 30),
    goal: payload.goal || 'general-fitness',
    recoveryFallback: (payload.recoveryFallback ?? payload.recovery_fallback ?? 'ready') as RecoveryFallback,
    exercises: (payload.exercises ?? []).map(normalizeQuickWorkoutExercise)
  }
}

export function validateDuration(value: number): string | null {
  if (!Number.isInteger(value)) return 'Duration must be a whole number.'
  if (value < MIN_DURATION || value > MAX_DURATION) return 'Duration must be between 15 and 90 minutes.'
  return null
}

export function goalLabel(goal: string): string {
  return displayName(goal || 'general-fitness')
}

export function prescriptionText(exercise: QuickWorkoutExercise): string {
  return `${exercise.sets} × ${exercise.reps} · ${exercise.restSec} sec rest`
}

export function fallbackText(fallback: RecoveryFallback): string {
  if (fallback === 'ready') return 'Built from recovered muscle groups.'
  if (fallback === 'moderate') return 'Included moderate-recovery muscles to complete the workout.'
  return 'Used available recovering muscles because options were limited.'
}

export function requestSummary(duration: number, targetMuscles: string[]): string {
  return targetMuscles.length === 0
    ? `${duration} min · profile goal and equipment`
    : `${duration} min · ${targetMuscles.map(displayName).join(', ')}`
}
