// src/server/programs/service.js

import {
  createProgramRepository
} from '../db/repositories/programs/index.js'
import {
  createExerciseService
} from '../exercises/service.js'

function validationError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

function notFoundError(message) {
  const error = new Error(message)
  error.statusCode = 404
  return error
}

export function createProgramService(db) {
  const repository = createProgramRepository(db)
  const exerciseService = createExerciseService(db)

  function listPrograms(options = {}) {
    const programs = repository.list()

    return options.includeTemporary
      ? programs
      : programs.filter((program) => !program.isTemporary)
  }

  function getProgram(id) {
    return repository.getById(id)
  }

  function getProgramBySlug(slug) {
    return repository.getBySlug(slug)
  }

  function createProgram(input) {
    return repository.create({
      ...input,
      exercises: validateProgramExercises(
        input.exercises ?? []
      )
    })
  }

  function updateProgram(id, input) {
    const existing = repository.getById(id)

    if (!existing) {
      return null
    }

    const updateInput = {
      ...input
    }

    if (Array.isArray(input.exercises)) {
      updateInput.exercises = validateProgramExercises(
        input.exercises
      )
    }

    return repository.update(id, updateInput)
  }

  function deleteProgram(id) {
    return repository.remove(id)
  }

  function duplicateProgram(id) {
    return repository.duplicate(id)
  }

  function getProgramCount() {
    return repository.count()
  }

  function getPublishableProgram(id) {
    const program = repository.getById(id)

    if (!program) {
      return null
    }

    return {
      slug: program.slug,
      name: program.name,
      description: program.description,
      difficulty: program.difficulty,
      tags: program.tags,
      blocks: program.blocks,
      exercises: program.exercises.map((exercise) => ({
        exerciseSlug: exercise.exerciseSlug,
        position: exercise.position,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        targetWeight: exercise.targetWeight,
        notes: exercise.notes
      }))
    }
  }

  function requireProgram(id) {
    const program = repository.getById(id)

    if (!program) {
      throw notFoundError('Program not found')
    }

    return program
  }

  function validateProgramExercises(exercises) {
    if (!Array.isArray(exercises)) {
      throw validationError('Program exercises must be an array')
    }

    return exercises.map((entry, index) => {
      const exercise = resolveExercise(entry)

      if (!exercise) {
        throw validationError(
          'Program contains an invalid exercise reference'
        )
      }

      return {
        ...entry,
        exerciseId: exercise.id,
        exerciseSlug: exercise.slug,
        position: entry.position ?? index
      }
    })
  }

  function resolveExercise(entry) {
    if (entry.exerciseId !== undefined) {
      return exerciseService.getExercise(
        Number(entry.exerciseId)
      )
    }

    if (entry.exerciseSlug) {
      return exerciseService.getExerciseBySlug(
        entry.exerciseSlug
      )
    }

    return null
  }

  return {
    listPrograms,
    getProgram,
    getProgramBySlug,
    createProgram,
    updateProgram,
    deleteProgram,
    duplicateProgram,
    getProgramCount,
    getPublishableProgram,
    requireProgram
  }
}
