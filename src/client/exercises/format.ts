import { localExerciseImageUrl } from './image.js'
import type { Exercise, ExerciseApiPayload } from './types.js'

export function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

export function normalizeExercise(payload: ExerciseApiPayload): Exercise {
  return {
    id: Number(payload.id),
    slug: payload.slug || String(payload.id),
    name: payload.name || 'Unnamed exercise',
    description: payload.description || '',
    category: payload.category || '',
    muscleGroup: payload.muscleGroup || payload.muscle_group || '',
    muscles: asTextArray(payload.muscles),
    equipment: asTextArray(payload.equipment),
    difficulty: payload.difficulty || '',
    movementType: payload.movementType || payload.movement_type || '',
    tags: asTextArray(payload.tags),
    instructions: asTextArray(payload.instructions),
    imageUrl: localExerciseImageUrl(payload.imageUrl || payload.image_url || ''),
    favourite: Boolean(payload.favourite),
    defaultSets: Number(payload.defaultSets ?? payload.default_sets ?? 3),
    defaultReps: String(payload.defaultReps ?? payload.default_reps ?? '8-12'),
    defaultRest: Number(payload.defaultRest ?? payload.default_rest ?? 90)
  }
}

export function displayName(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function pluralizeExercise(count: number): string {
  return count === 1 ? '1 exercise' : `${count} exercises`
}

export function prescriptionText(exercise: Exercise): string {
  return `${exercise.defaultSets} sets · ${exercise.defaultReps} reps · ${exercise.defaultRest} sec rest`
}
