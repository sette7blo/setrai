import type { Exercise, ExerciseApiPayload } from '../exercises/types.js'

export interface ProgramExerciseApiPayload {
  exercise?: ExerciseApiPayload
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
  blocks?: TrainingBlock[]
}

export interface TrainingStep {
  exerciseSlug: string
  exerciseName?: string
  targetReps?: string
  targetDurationSec?: number
  weight?: number | null
  notes?: string
}

export interface TrainingBlock {
  type: 'straight' | 'emom'
  rounds: number
  steps?: TrainingStep[]
  restAfterRoundSec?: number
  intervals?: { durationSec: number; steps: TrainingStep[] }[]
  totalDurationSec?: number
}

export interface ProgramInput {
  name: string
  description: string
  difficulty: string
  tags: string[]
  blocks?: TrainingBlock[]
  exercises: ProgramExerciseApiPayload[]
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
  blocks?: TrainingBlock[]
}

export interface SessionSetApiPayload {
  durationSec?: number
  blockIndex?: number
  roundIndex?: number
  intervalIndex?: number
  stepIndex?: number
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
  blocks?: TrainingBlock[]
  runtime?: LiveRuntime
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
  durationSec?: number
  blockIndex?: number
  roundIndex?: number
  intervalIndex?: number
  stepIndex?: number
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
  blocks?: TrainingBlock[]
  runtime?: LiveRuntime
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
  durationSec?: number
  blockIndex?: number
  roundIndex?: number
  intervalIndex?: number
  stepIndex?: number
  exerciseId: number
  setNumber: number
  reps: number
  weight: number | null
  done: boolean
}

export interface LiveRuntime {
  mode?: 'strength' | 'emom'
  exerciseIndex?: number
  setCounts?: Record<string, number>
  restEndsAt?: number | null
  restDurationSec?: number
  restNextIndex?: number | null
  emomStartedAt?: number | null
  emomPositionSec?: number
  emomActiveSec?: number
  emomRunningSince?: number | null
}

export interface UpdateSetInput {
  durationSec?: number
  setNumber?: number
  reps?: number
  weight?: number | null
  done?: boolean
}
