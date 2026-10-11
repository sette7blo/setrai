import { displayName, normalizeExercise } from '../exercises/format.js'
import type {
  Program,
  ProgramApiPayload,
  ProgramExercise,
  ProgramExerciseApiPayload,
  Session,
  SessionApiPayload,
  SessionSet,
  SessionSetApiPayload
} from './types.js'

function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function normalizeProgramExercise(payload: ProgramExerciseApiPayload): ProgramExercise {
  return {
    id: payload.id ?? null,
    exerciseId: Number(payload.exerciseId ?? payload.exercise_id ?? 0),
    exerciseSlug: payload.exerciseSlug ?? payload.exercise_slug ?? '',
    exerciseName: payload.exerciseName?.trim() || payload.exercise_name?.trim() || payload.exercise?.name?.trim() || displayName(payload.exerciseSlug ?? payload.exercise_slug ?? '') || 'Exercise',
    position: Number(payload.position ?? 0),
    sets: Number(payload.sets ?? 3),
    reps: String(payload.reps ?? '8-12'),
    restSec: Number(payload.restSec ?? payload.restSeconds ?? payload.rest_sec ?? 90),
    weight: payload.weight ?? payload.targetWeight ?? null,
    notes: payload.notes ?? '',
    exercise: payload.exercise ? normalizeExercise(payload.exercise) : undefined
  }
}

export function normalizeProgram(payload: ProgramApiPayload): Program {
  return {
    id: Number(payload.id),
    slug: payload.slug || String(payload.id),
    name: payload.name || 'Untitled program',
    description: payload.description || '',
    difficulty: payload.difficulty || '',
    tags: textArray(payload.tags),
    isTemporary: Boolean(payload.isTemporary ?? payload.is_temporary),
    blocks: payload.blocks ?? [],
    nostrAddress: payload.nostrAddress ?? null,
    nostrPubkey: payload.nostrPubkey ?? null,
    nostrEventId: payload.nostrEventId ?? null,
    exercises: (payload.exercises ?? [])
      .map(normalizeProgramExercise)
      .sort((a, b) => a.position - b.position)
  }
}

export function normalizeSessionSet(payload: SessionSetApiPayload): SessionSet {
  return {
    id: Number(payload.id),
    sessionId: Number(payload.sessionId ?? payload.session_id ?? 0),
    exerciseId: Number(payload.exerciseId ?? payload.exercise_id ?? 0),
    exerciseSlug: payload.exerciseSlug ?? payload.exercise_slug ?? '',
    exerciseName: payload.exerciseName ?? payload.exercise_name ?? 'Exercise',
    setNumber: Number(payload.setNumber ?? payload.set_number ?? 1),
    reps: Number(payload.reps ?? 0),
    weight: payload.weight ?? null,
    done: Boolean(payload.done),
    loggedAt: payload.loggedAt ?? payload.logged_at ?? '',
    durationSec: payload.durationSec,
    blockIndex: payload.blockIndex,
    roundIndex: payload.roundIndex,
    intervalIndex: payload.intervalIndex,
    stepIndex: payload.stepIndex
  }
}

export function normalizeSession(payload: SessionApiPayload): Session {
  return {
    id: Number(payload.id),
    programId: payload.programId ?? payload.program_id ?? null,
    programName: payload.programName ?? payload.program_name ?? 'Workout',
    startedAt: payload.startedAt ?? payload.started_at ?? '',
    finishedAt: payload.finishedAt ?? payload.finished_at ?? null,
    notes: payload.notes ?? '',
    blocks: payload.blocks ?? [],
    runtime: payload.runtime ?? {},
    sets: (payload.sets ?? []).map(normalizeSessionSet),
    plannedExercises: (payload.plannedExercises ?? []).map(normalizeProgramExercise)
  }
}

export function programSummary(program: Program): string {
  const count = program.exercises.length
  const exerciseText = count === 1 ? '1 exercise' : `${count} exercises`
  return program.difficulty ? `${exerciseText} · ${displayName(program.difficulty)}` : exerciseText
}

export function prescriptionLine(exercise: ProgramExercise): string {
  const weight = exercise.weight === null ? '' : ` · ${exercise.weight} kg`
  return `${exercise.sets} sets · ${exercise.reps} reps · ${exercise.restSec} sec rest${weight}`
}

export function formatWeight(weight: number | null): string {
  return weight === null ? 'bodyweight' : `${weight} kg`
}
