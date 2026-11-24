import { apiClient, type ApiClient } from '../shared/api/client.js'
import { detectedTimeZone, setTrainingTimeZone } from '../shared/training-time-zone.js'
import type { Profile, ProfileApiPayload, ProfilePatch } from './types.js'

interface ProfileResponse { profile: ProfileApiPayload }

export function normalizeProfile(payload: ProfileApiPayload): Profile {
  return {
    displayName: payload.displayName ?? '',
    avatarUrl: payload.avatarUrl ?? '',
    weightUnit: payload.weightUnit === 'lb' ? 'lb' : 'kg',
    trainingGoal: payload.trainingGoal || 'general-fitness',
    equipment: Array.isArray(payload.equipment) ? payload.equipment.filter((item): item is string => typeof item === 'string') : [],
    heightCm: Number.isFinite(Number(payload.heightCm)) && Number(payload.heightCm) > 0 ? Number(payload.heightCm) : null,
    targetWeightKg: Number.isFinite(Number(payload.targetWeightKg)) && Number(payload.targetWeightKg) > 0 ? Number(payload.targetWeightKg) : null,
    timeZone: typeof payload.timeZone === 'string' ? payload.timeZone : ''
  }
}

// Every profile read also sets the zone History and Today bucket days by.
function useProfileTimeZone(profile: Profile): Profile {
  if (profile.timeZone) setTrainingTimeZone(profile.timeZone)
  return profile
}

// First load: an unset profile zone takes the browser's, so the server's
// statistics and this device agree on where a day ends.
export async function syncTrainingTimeZone(client: ApiClient = apiClient): Promise<void> {
  const profile = await getProfile(client)
  if (!profile.timeZone) await updateProfile({ timeZone: detectedTimeZone() }, client)
}

export async function getProfile(client: ApiClient = apiClient): Promise<Profile> {
  const response = await client.get<ProfileResponse>('/api/profile')
  return useProfileTimeZone(normalizeProfile(response.profile))
}

export async function updateProfile(patch: ProfilePatch, client: ApiClient = apiClient): Promise<Profile> {
  const response = await client.request<ProfileResponse>('/api/profile', {
    method: 'PATCH',
    body: patch
  })
  return useProfileTimeZone(normalizeProfile(response.profile))
}
