import type { WeightUnit } from '../profile/types.js'
import type { Session, ProgramExercise, LogSetInput } from './types.js'
import type { IntervalSlot } from './live-plan.js'

export interface LiveModel {
  session: Session
  exercises: ProgramExercise[]
  intervals: IntervalSlot[]
  unit: WeightUnit
  busy: boolean
  openInstructions: Set<string>
  drafts: Map<string, { reps: string; weight: string }>
  intervalPage: number
  error: string
}

export interface LiveActions {
  jump(index: number): void
  addSet(exercise: ProgramExercise): void
  log(input: LogSetInput, exercise?: ProgramExercise): void
  edit(id: number): void
  finish(): void
  discard(): void
  startEmom(): void
  pause(): void
  seek(index: number): void
  rest(delta: number | null): void
  render(): void
}
