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
  /** Set by logging a set; the row that becomes current next animates in once. */
  currentMoved?: boolean
  /** When that row first appeared, so a re-render mid-animation continues it instead of restarting. */
  currentArrivedAt?: number
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
