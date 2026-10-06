import type { Exercise, ExerciseFilters } from './types.js'

export const EMPTY_FILTERS: ExerciseFilters = {
  search: '',
  favouritesOnly: false,
  muscle: '',
  equipment: '',
  difficulty: ''
}

function normalized(value: string): string {
  return value.trim().toLowerCase()
}

export function activeFilterCount(filters: ExerciseFilters): number {
  return [
    filters.search.trim(),
    filters.favouritesOnly,
    filters.muscle,
    filters.equipment,
    filters.difficulty
  ].filter(Boolean).length
}

export function exerciseMatchesFilters(
  exercise: Exercise,
  filters: ExerciseFilters
): boolean {
  if (filters.favouritesOnly && !exercise.favourite) {
    return false
  }

  if (filters.muscle && exercise.muscleGroup !== filters.muscle) {
    return false
  }

  if (filters.equipment && !exercise.equipment.includes(filters.equipment)) {
    return false
  }

  if (filters.difficulty && exercise.difficulty !== filters.difficulty) {
    return false
  }

  const query = normalized(filters.search)

  if (!query) {
    return true
  }

  return [
    exercise.name,
    exercise.muscleGroup,
    ...exercise.equipment
  ].some((value) => normalized(value).includes(query))
}

export function filterExercises(
  exercises: Exercise[],
  filters: ExerciseFilters
): Exercise[] {
  return exercises.filter((exercise) => exerciseMatchesFilters(exercise, filters))
}

export function uniqueMuscles(exercises: Exercise[]): string[] {
  return [...new Set(exercises.map((exercise) => exercise.muscleGroup).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
}

export function uniqueEquipment(exercises: Exercise[]): string[] {
  return [...new Set(exercises.flatMap((exercise) => exercise.equipment).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
}

export function uniqueDifficulties(exercises: Exercise[]): string[] {
  return [...new Set(exercises.map((exercise) => exercise.difficulty).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
}

export function filtersFromUrl(searchParams: URLSearchParams): ExerciseFilters {
  return {
    search: searchParams.get('search') || '',
    favouritesOnly: searchParams.get('favourite') === 'true',
    muscle: searchParams.get('muscle') || '',
    equipment: searchParams.get('equipment') || '',
    difficulty: searchParams.get('difficulty') || ''
  }
}

export function filtersToUrl(filters: ExerciseFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search.trim()) {
    params.set('search', filters.search.trim())
  }

  if (filters.favouritesOnly) {
    params.set('favourite', 'true')
  }

  if (filters.muscle) {
    params.set('muscle', filters.muscle)
  }

  if (filters.equipment) {
    params.set('equipment', filters.equipment)
  }

  if (filters.difficulty) {
    params.set('difficulty', filters.difficulty)
  }

  return params
}
