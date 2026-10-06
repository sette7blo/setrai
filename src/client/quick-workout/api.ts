import { apiClient, type ApiClient } from '../shared/api/client.js'
import { normalizeProgram, normalizeSession } from '../workouts/format.js'
import type { Program, Session } from '../workouts/types.js'
import { normalizeQuickWorkout } from './format.js'
import type { GenerateQuickWorkoutInput, QuickWorkout, QuickWorkoutResponse, StartQuickWorkoutResponse } from './types.js'

export async function generateQuickWorkout(input: GenerateQuickWorkoutInput, client: ApiClient = apiClient): Promise<QuickWorkout> {
  const body = input.targetMuscles && input.targetMuscles.length > 0
    ? input
    : { durationMinutes: input.durationMinutes }
  const response = await client.request<QuickWorkoutResponse>('/api/quick-workout', {
    method: 'POST',
    body
  })
  return normalizeQuickWorkout(response.workout)
}

export async function startQuickWorkout(workout: QuickWorkout, client: ApiClient = apiClient): Promise<{ program: Program, session: Session }> {
  const response = await client.request<StartQuickWorkoutResponse>('/api/quick-workout/start', {
    method: 'POST',
    body: { workout }
  })
  return {
    program: normalizeProgram(response.program),
    session: normalizeSession(response.session)
  }
}
