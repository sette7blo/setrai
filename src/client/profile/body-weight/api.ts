import { apiClient, type ApiClient } from '../../shared/api/client.js'
import type { BodyWeightApiPayload, BodyWeightEntry, BodyWeightListResponse, BodyWeightResponse } from './types.js'

export function normalizeBodyWeight(payload: BodyWeightApiPayload): BodyWeightEntry {
  return {
    id: Number(payload.id),
    date: payload.date,
    weightKg: Number(payload.weightKg ?? payload.weight_kg ?? 0),
    notes: payload.notes ?? '',
    createdAt: payload.createdAt ?? payload.created_at ?? '',
    updatedAt: payload.updatedAt ?? payload.updated_at ?? ''
  }
}

export async function listBodyWeight(client: ApiClient = apiClient): Promise<BodyWeightEntry[]> {
  const response = await client.get<BodyWeightListResponse>('/api/body-weight')
  return response.entries.map(normalizeBodyWeight)
}

export async function getLatestBodyWeight(client: ApiClient = apiClient): Promise<BodyWeightEntry | null> {
  try {
    const response = await client.get<BodyWeightResponse>('/api/body-weight/latest')
    return normalizeBodyWeight(response.entry)
  } catch {
    return null
  }
}

export async function saveBodyWeight(input: { date: string, weightKg: number, notes: string }, client: ApiClient = apiClient): Promise<BodyWeightEntry> {
  const response = await client.request<BodyWeightResponse>('/api/body-weight', {
    method: 'POST',
    body: input
  })
  return normalizeBodyWeight(response.entry)
}

export async function updateBodyWeight(id: number, input: Partial<{ date: string, weightKg: number, notes: string }>, client: ApiClient = apiClient): Promise<BodyWeightEntry> {
  const response = await client.request<BodyWeightResponse>(`/api/body-weight/${id}`, {
    method: 'PATCH',
    body: input
  })
  return normalizeBodyWeight(response.entry)
}

export async function deleteBodyWeight(id: number, client: ApiClient = apiClient): Promise<void> {
  await client.request<void>(`/api/body-weight/${id}`, { method: 'DELETE' })
}
