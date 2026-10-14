import { apiClient, type ApiClient } from '../shared/api/client.js'
import type { Exercise, ExerciseListResponse, ExercisePatch, ExerciseResponse, ExerciseWrite } from './types.js'
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

export async function createExercise(
  body: ExerciseWrite,
  client: ApiClient = apiClient
): Promise<Exercise> {
  const response = await client.request<ExerciseResponse>('/api/exercises', {
    method: 'POST',
    body
  })
  return normalizeExercise(response.exercise)
}

export async function updateExercise(
  id: number,
  body: ExerciseWrite,
  client: ApiClient = apiClient
): Promise<Exercise> {
  const response = await client.request<ExerciseResponse>(`/api/exercises/${id}`, {
    method: 'PATCH',
    body
  })
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

export async function deleteExercise(
  id: number,
  client: ApiClient = apiClient
): Promise<void> {
  await client.request<void>(`/api/exercises/${id}`, {
    method: 'DELETE'
  })
}

export async function uploadExerciseImage(
  file: File,
  client: ApiClient = apiClient
): Promise<string> {
  const form = new FormData()
  form.append('image', file, file.name || 'upload')
  const response = await client.upload<{ imageUrl: string }>('/api/exercises/upload', form)
  return response.imageUrl
}
