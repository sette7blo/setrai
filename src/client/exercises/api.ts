import { apiClient, type ApiClient } from '../shared/api/client.js'
import type { Exercise, ExerciseListResponse, ExercisePatch, ExerciseResponse } from './types.js'
import { normalizeExercise } from './format.js'

export async function listExercises(
  client: ApiClient = apiClient,
  signal?: AbortSignal
): Promise<Exercise[]> {
  const response = await client.get<ExerciseListResponse>('/api/exercises', signal)
  return response.exercises.map(normalizeExercise)
}

export async function getExercise(
  id: number,
  client: ApiClient = apiClient,
  signal?: AbortSignal
): Promise<Exercise> {
  const response = await client.get<ExerciseResponse>(`/api/exercises/${id}`, signal)
  return normalizeExercise(response.exercise)
}

export async function setExerciseFavourite(
  id: number,
  favourite: boolean,
  client: ApiClient = apiClient
): Promise<Exercise> {
  const body: ExercisePatch = { favourite }
  const response = await client.request<ExerciseResponse>(`/api/exercises/${id}`, {
    method: 'PATCH',
    body
  })

  return normalizeExercise(response.exercise)
}
