import { apiClient, type ApiClient } from '../shared/api/client.js'
import type { Profile, ProfileApiPayload, ProfilePatch } from './types.js'

interface ProfileResponse { profile: ProfileApiPayload }

export function normalizeProfile(payload: ProfileApiPayload): Profile {
  return {
    displayName: payload.displayName ?? '',
    avatarUrl: payload.avatarUrl ?? '',
    weightUnit: payload.weightUnit === 'lb' ? 'lb' : 'kg',
    trainingGoal: payload.trainingGoal ?? '',
    equipment: Array.isArray(payload.equipment) ? payload.equipment.filter((item): item is string => typeof item === 'string') : []
  }
}

export async function getProfile(client: ApiClient = apiClient): Promise<Profile> {
  const response = await client.get<ProfileResponse>('/api/profile')
  return normalizeProfile(response.profile)
}

export async function updateProfile(patch: ProfilePatch, client: ApiClient = apiClient): Promise<Profile> {
  const response = await client.request<ProfileResponse>('/api/profile', {
    method: 'PATCH',
    body: patch
  })
  return normalizeProfile(response.profile)
}
