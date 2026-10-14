import { apiClient } from '../shared/api/client.js'
import { normalizeExercise } from '../exercises/format.js'
import type { Exercise, ExerciseApiPayload } from '../exercises/types.js'
import type { CatalogEntry } from '../exercises/catalog.js'

/** Nostr exercise catalog client used by Exercises when Nostr is enabled. */
export type CatalogExerciseEntry = CatalogEntry
/** @deprecated Prefer CatalogExerciseEntry */
export type DiscoveredExercise = CatalogExerciseEntry

interface CatalogExercise extends ExerciseApiPayload {
  nostr_event_id: string
  nostr_address: string
  localId: number | null
  updateAvailable?: boolean
}

export async function loadCatalog(refresh = false): Promise<CatalogExerciseEntry[]> {
  const response = await apiClient.get<{ exercises: CatalogExercise[] }>(
    `/api/nostr/exercises${refresh ? '?refresh=true' : ''}`
  )
  return response.exercises.map(item => ({
    exercise: normalizeExercise({ ...item, id: item.localId ?? 0 }), eventId: item.nostr_event_id,
    address: item.nostr_address, localId: item.localId, updateAvailable: Boolean(item.updateAvailable)
  }))
}

export async function importCatalogExercise(eventId: string, update = false, replaceImage = false): Promise<Exercise> {
  const response = await apiClient.request<{ exercise: ExerciseApiPayload }>(`/api/nostr/exercises/${update ? 'update' : 'import'}`, {
    method: 'POST', body: replaceImage && update ? { eventId, replaceImage: true } : { eventId }
  })
  return normalizeExercise(response.exercise)
}
