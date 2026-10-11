export type WeightUnit = 'kg' | 'lb'

export interface ProfileApiPayload {
  displayName?: string
  avatarUrl?: string
  weightUnit?: WeightUnit
  trainingGoal?: string
  equipment?: string[]
  heightCm?: number | null
  targetWeightKg?: number | null
}

export interface Profile {
  displayName: string
  avatarUrl: string
  weightUnit: WeightUnit
  trainingGoal: string
  equipment: string[]
  heightCm: number | null
  targetWeightKg: number | null
}

export type ProfilePatch = Partial<Profile>
