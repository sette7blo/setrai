import type { ProgramApiPayload, SessionApiPayload } from '../workouts/types.js'

export type RecoveryFallback = 'ready' | 'moderate' | 'recovering'

export interface QuickWorkoutExerciseApiPayload {
  exerciseId?: number
  exercise_id?: number
  exerciseSlug?: string
  exercise_slug?: string
  exerciseName?: string
  exercise_name?: string
  sets?: number
  reps?: string
  restSec?: number
  restSeconds?: number
  rest_sec?: number
}

export interface QuickWorkoutApiPayload {
  name?: string
  durationMinutes?: number
  duration_minutes?: number
  goal?: string
  recoveryFallback?: RecoveryFallback
  recovery_fallback?: RecoveryFallback
  exercises?: QuickWorkoutExerciseApiPayload[]
}

export interface QuickWorkoutExercise {
  exerciseId: number
  exerciseSlug: string
  exerciseName: string
  sets: number
  reps: string
  restSec: number
}

export interface QuickWorkout {
  name: string
  durationMinutes: number
  goal: string
  recoveryFallback: RecoveryFallback
  exercises: QuickWorkoutExercise[]
}

export interface GenerateQuickWorkoutInput {
  durationMinutes: number
  targetMuscles?: string[]
}

export interface QuickWorkoutResponse { workout: QuickWorkoutApiPayload }
export interface StartQuickWorkoutResponse {
  workout: QuickWorkoutApiPayload
  program: ProgramApiPayload
  session: SessionApiPayload
}
