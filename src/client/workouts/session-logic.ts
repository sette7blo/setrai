import type { Program, ProgramExercise, Session, SessionSet } from './types.js'

export interface LiveProgress {
  exerciseIndex: number
  setNumber: number
  plannedSets: number
}

export function setsForExercise(session: Session, exerciseId: number): SessionSet[] {
  return session.sets
    .filter((set) => set.exerciseId === exerciseId)
    .sort((a, b) => a.setNumber - b.setNumber || a.id - b.id)
}

export function completedSetCount(session: Session): number {
  return session.sets.filter((set) => set.done).length
}

export function totalPlannedSets(program: Program | null): number {
  return program?.exercises.reduce((total, exercise) => total + exercise.sets, 0) ?? 0
}

export function plannedSetsRemaining(session: Session, program: Program | null): number {
  return Math.max(totalPlannedSets(program) - completedSetCount(session), 0)
}

export function currentSetNumber(session: Session, exercise: ProgramExercise): number {
  const done = setsForExercise(session, exercise.exerciseId).filter((set) => set.done).length
  return Math.min(done + 1, exercise.sets)
}

export function firstIncompleteExerciseIndex(session: Session, program: Program): number {
  const index = program.exercises.findIndex((exercise) => (
    setsForExercise(session, exercise.exerciseId).filter((set) => set.done).length < exercise.sets
  ))

  return index === -1 ? Math.max(program.exercises.length - 1, 0) : index
}

export function sessionProgress(session: Session, program: Program | null): string {
  if (!program || program.exercises.length === 0) {
    return `${completedSetCount(session)} sets logged`
  }

  const completedExercises = program.exercises.filter((exercise) => (
    setsForExercise(session, exercise.exerciseId).filter((set) => set.done).length >= exercise.sets
  )).length

  return `${completedExercises} / ${program.exercises.length} exercises · ${completedSetCount(session)} / ${totalPlannedSets(program)} sets`
}

export function simpleVolume(session: Session): number {
  return session.sets.reduce((total, set) => total + (set.done ? (set.weight ?? 0) * set.reps : 0), 0)
}
