import type { Exercise } from '../exercises/types.js'

export interface ProgramExerciseApiPayload {
  id?: number
  exerciseId?: number
  exercise_id?: number
  exerciseSlug?: string
  exercise_slug?: string
  exerciseName?: string
  exercise_name?: string
  position?: number
  sets?: number
  reps?: string
  restSeconds?: number
  restSec?: number
  rest_sec?: number
  targetWeight?: number | null
  weight?: number | null
  notes?: string
}

export interface ProgramApiPayload {
  id: number
  slug: string
  name: string
  description?: string
  difficulty?: string
  tags?: string[]
  isTemporary?: boolean
  is_temporary?: boolean
  exercises?: ProgramExerciseApiPayload[]
}

export interface ProgramExercise {
  id: number | null
  exerciseId: number
  exerciseSlug: string
  exerciseName: string
  position: number
  sets: number
  reps: string
  restSec: number
  weight: number | null
  notes: string
  exercise?: Exercise
}

export interface Program {
  id: number
  slug: string
  name: string
  description: string
  difficulty: string
  tags: string[]
  isTemporary: boolean
  exercises: ProgramExercise[]
}

export interface SessionSetApiPayload {
  id: number
  sessionId?: number
  session_id?: number
  exerciseId?: number
  exercise_id?: number
  exerciseSlug?: string
  exercise_slug?: string
  exerciseName?: string
  exercise_name?: string
  setNumber?: number
  set_number?: number
  reps?: number
  weight?: number | null
  done?: boolean
  loggedAt?: string
  logged_at?: string
}

export interface SessionApiPayload {
  id: number
  programId?: number | null
  program_id?: number | null
  programName?: string
  program_name?: string
  startedAt?: string
  started_at?: string
  finishedAt?: string | null
  finished_at?: string | null
  notes?: string
  sets?: SessionSetApiPayload[]
  plannedExercises?: ProgramExerciseApiPayload[]
}

export interface SessionSet {
  id: number
  sessionId: number
  exerciseId: number
  exerciseSlug: string
  exerciseName: string
  setNumber: number
  reps: number
  weight: number | null
  done: boolean
  loggedAt: string
}

export interface Session {
  id: number
  programId: number | null
  programName: string
  startedAt: string
  finishedAt: string | null
  notes: string
  sets: SessionSet[]
  plannedExercises: ProgramExercise[]
}

export interface ProgramListResponse { programs: ProgramApiPayload[] }
export interface ProgramResponse { program: ProgramApiPayload }
export interface SessionListResponse { sessions: SessionApiPayload[] }
export interface SessionResponse { session: SessionApiPayload }
export interface SessionSetResponse { set: SessionSetApiPayload }

export interface LogSetInput {
  exerciseId: number
  setNumber: number
  reps: number
  weight: number | null
  done: boolean
}

export interface UpdateSetInput {
  setNumber?: number
  reps?: number
  weight?: number | null
  done?: boolean
}
