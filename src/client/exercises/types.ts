export interface ExerciseApiPayload {
  id: number
  slug: string
  name: string
  description?: string
  category?: string
  muscleGroup?: string
  muscle_group?: string
  muscles?: string[]
  equipment?: string[]
  difficulty?: string
  tags?: string[]
  instructions?: string[]
  imageUrl?: string
  image_url?: string
  favourite?: boolean
  defaultSets?: number
  default_sets?: number
  defaultReps?: string
  default_reps?: string
  defaultRest?: number
  default_rest?: number
}

export interface Exercise {
  id: number
  slug: string
  name: string
  description: string
  category: string
  muscleGroup: string
  muscles: string[]
  equipment: string[]
  difficulty: string
  tags: string[]
  instructions: string[]
  imageUrl: string
  favourite: boolean
  defaultSets: number
  defaultReps: string
  defaultRest: number
}

export interface ExerciseListResponse {
  exercises: ExerciseApiPayload[]
}

export interface ExerciseResponse {
  exercise: ExerciseApiPayload
}

export interface ExerciseFilters {
  search: string
  favouritesOnly: boolean
  muscle: string
  equipment: string
  difficulty: string
}

export interface ExercisePatch {
  favourite: boolean
}
