export interface BodyWeightApiPayload {
  id: number
  date: string
  weightKg?: number
  weight_kg?: number
  notes?: string
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

export interface BodyWeightEntry {
  id: number
  date: string
  weightKg: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface BodyWeightListResponse { entries: BodyWeightApiPayload[] }
export interface BodyWeightResponse { entry: BodyWeightApiPayload }
