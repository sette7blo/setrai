export type WeightUnit = 'kg' | 'lb'

export interface ProfileApiPayload {
  displayName?: string
  avatarUrl?: string
  weightUnit?: WeightUnit
  trainingGoal?: string
  equipment?: string[]
}

export interface Profile {
  displayName: string
  avatarUrl: string
  weightUnit: WeightUnit
  trainingGoal: string
  equipment: string[]
}

export type ProfilePatch = Partial<Profile>
