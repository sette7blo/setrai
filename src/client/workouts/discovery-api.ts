import { apiClient, type ApiClient } from '../shared/api/client.js'
import { normalizeExercise } from '../exercises/format.js'
import { normalizeProgram } from './format.js'
import type { Program, ProgramApiPayload, TrainingBlock } from './types.js'

interface CatalogProgram {
  slug: string
  name: string
  description: string
  difficulty: string
  tags: string[]
  blocks: TrainingBlock[]
  eventId: string
  address: string
  pubkey: string
  sourceLabel: string
  muscleMapUrl: string
  localId: number | null
  updateAvailable?: boolean
  exercises: {
    address: string; name: string; muscleGroup: string; muscles: string[]; equipment: string[]
    imageUrl: string; sets: number; reps: string; restSec: number; weight: number | null; notes: string
  }[]
}

export interface ProgramCatalog { programs: Program[]; fetchedAt: number; unavailableRelays: number }

export async function loadProgramCatalog(refresh = false, client: ApiClient = apiClient): Promise<ProgramCatalog> {
  const response = await client.get<{ programs: CatalogProgram[]; fetchedAt: number; unavailableRelays: number }>(
    `/api/nostr/programs${refresh ? '?refresh=true' : ''}`
  )
  return { ...response, programs: response.programs.map(item => ({
    ...normalizeProgram({ ...item, id: item.localId ?? 0, nostrAddress: item.address, nostrPubkey: item.pubkey, nostrEventId: item.eventId,
      exercises: item.exercises.map((entry, position) => ({ ...entry, position, exerciseSlug: entry.address.split(':').at(-1), exerciseName: entry.name })) }),
    sourceLabel: item.sourceLabel, muscleMapUrl: item.muscleMapUrl, localId: item.localId, updateAvailable: item.updateAvailable,
    exercises: item.exercises.map((entry, position) => ({
      id: null, exerciseId: 0, exerciseSlug: entry.address.split(':').at(-1) ?? '', exerciseName: entry.name,
      position, sets: entry.sets, reps: entry.reps, restSec: entry.restSec, weight: entry.weight, notes: entry.notes,
      exercise: normalizeExercise({ ...entry, id: 0, slug: entry.address.split(':').at(-1) ?? '' })
    }))
  })) }
}

export async function importCatalogProgram(eventId: string, client: ApiClient = apiClient): Promise<Program> {
  const response = await client.request<{ program: ProgramApiPayload }>('/api/nostr/programs/import', { method: 'POST', body: { eventId } })
  return normalizeProgram(response.program)
}

export interface ProgramUpdateReview {
  legacy: boolean
  fields: { field: string; changed: boolean; apply: boolean }[]
}
export async function reviewCatalogProgram(eventId: string, client: ApiClient = apiClient): Promise<ProgramUpdateReview> {
  const response = await client.get<{ review: ProgramUpdateReview }>(`/api/nostr/programs/review?eventId=${encodeURIComponent(eventId)}`)
  return response.review
}
export async function updateCatalogProgram(eventId: string, client: ApiClient = apiClient): Promise<Program> {
  const response = await client.request<{ program: ProgramApiPayload }>('/api/nostr/programs/update', { method: 'POST', body: { eventId } })
  return normalizeProgram(response.program)
}
