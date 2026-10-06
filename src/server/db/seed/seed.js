import {
  createExerciseRepository
} from '../repositories/exercises/index.js'
import {
  BUILTIN_EXERCISES
} from './exercises/index.js'

const VALID_DIFFICULTIES = new Set([
  'beginner',
  'intermediate',
  'advanced'
])

const VALID_STATUSES = new Set([
  'active',
  'inactive'
])

const VALID_CATEGORIES = new Set([
  'strength',
  'bodyweight',
  'mobility',
  'cardio'
])

function assertArray(value, field, slug) {
  if (!Array.isArray(value)) {
    throw new Error(
      `Seed exercise ${slug} has invalid ${field}`
    )
  }

  for (const item of value) {
    if (typeof item !== 'string') {
      throw new Error(
        `Seed exercise ${slug} has non-string ${field}`
      )
    }
  }
}

function assertPositiveInteger(value, field, slug) {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `Seed exercise ${slug} has invalid ${field}`
    )
  }
}

export function validateBuiltinExercises(
  exercises = BUILTIN_EXERCISES
) {
  const slugs = new Set()

  for (const exercise of exercises) {
    const slug = exercise.slug

    if (
      typeof slug !== 'string' ||
      slug.trim() === ''
    ) {
      throw new Error('Seed exercise missing slug')
    }

    if (slugs.has(slug)) {
      throw new Error(
        `Duplicate seed exercise slug: ${slug}`
      )
    }

    slugs.add(slug)

    if (
      typeof exercise.name !== 'string' ||
      exercise.name.trim() === ''
    ) {
      throw new Error(
        `Seed exercise ${slug} missing name`
      )
    }

    if (!VALID_CATEGORIES.has(exercise.category)) {
      throw new Error(
        `Seed exercise ${slug} has invalid category`
      )
    }

    if (
      typeof exercise.muscle_group !== 'string' ||
      exercise.muscle_group.trim() === ''
    ) {
      throw new Error(
        `Seed exercise ${slug} missing muscle_group`
      )
    }

    assertArray(exercise.muscles, 'muscles', slug)
    assertArray(exercise.equipment, 'equipment', slug)
    assertArray(exercise.tags, 'tags', slug)
    assertArray(exercise.instructions, 'instructions', slug)

    if (exercise.instructions.length === 0) {
      throw new Error(
        `Seed exercise ${slug} missing instructions`
      )
    }

    if (!VALID_DIFFICULTIES.has(exercise.difficulty)) {
      throw new Error(
        `Seed exercise ${slug} has invalid difficulty`
      )
    }

    assertPositiveInteger(
      exercise.default_sets,
      'default_sets',
      slug
    )

    if (
      typeof exercise.default_reps !== 'string' ||
      exercise.default_reps.trim() === ''
    ) {
      throw new Error(
        `Seed exercise ${slug} has invalid default_reps`
      )
    }

    assertPositiveInteger(
      exercise.default_rest,
      'default_rest',
      slug
    )

    if (exercise.source_type !== 'builtin') {
      throw new Error(
        `Seed exercise ${slug} has invalid source_type`
      )
    }

    if (!VALID_STATUSES.has(exercise.status)) {
      throw new Error(
        `Seed exercise ${slug} has invalid status`
      )
    }
  }

  return true
}

export function seedBuiltinExercises(db) {
  validateBuiltinExercises()

  const repository = createExerciseRepository(db)
  const result = {
    checked: BUILTIN_EXERCISES.length,
    inserted: 0,
    existing: 0
  }

  for (const exercise of BUILTIN_EXERCISES) {
    const existing = repository.getBySlug(
      exercise.slug
    )

    if (existing) {
      result.existing += 1
      continue
    }

    repository.create(exercise)
    result.inserted += 1
  }

  return result
}

export function initializeDatabaseSeeds(db) {
  return {
    exercises: seedBuiltinExercises(db)
  }
}
