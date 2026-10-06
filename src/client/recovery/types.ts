export type RecoveryStatus = 'recovering' | 'moderate' | 'ready'

export interface RecoveryMuscleApiPayload {
  muscle: string
  recovery: number
  status: RecoveryStatus
  lastTrainedAt?: string
}

export interface RecoveryApiPayload {
  generatedAt?: string
  lookbackDays?: number
  muscles?: RecoveryMuscleApiPayload[]
}

export interface RecoveryMuscle {
  muscle: string
  recovery: number
  status: RecoveryStatus
  lastTrainedAt: string
}

export interface RecoveryOverview {
  generatedAt: string
  lookbackDays: number
  muscles: RecoveryMuscle[]
}
