import {
  createProgramRepository
} from '../db/repositories/programs/index.js'
import {
  createExerciseService
} from '../exercises/service.js'
import { normalizeProgramBlocks } from './blocks.js'
import { validateProgramInput } from './validation.js'

// Set only by Setrai itself (seeding, Quick Workout, duplication). Public
// create and update requests may echo them back from a GET, so they are
// ignored rather than rejected.
const INTERNAL_FIELDS = ['slug', 'isTemporary', 'seedKey', 'seedRevision', 'seedBaseline']

function withoutInternalFields(input) {
  const result = { ...input }
  for (const field of INTERNAL_FIELDS) delete result[field]
  return result
}

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
    validateProgramInput(input)
    return insertProgram(withoutInternalFields(input))
  }

  // Quick Workout's generated plan: hidden from the library.
  function createTemporaryProgram(input) {
    validateProgramInput(input)
    return insertProgram({ ...withoutInternalFields(input), isTemporary: true })
  }

  function insertProgram(input) {
    const exercises = validateProgramExercises(input.exercises ?? [])
    const createInput = { ...input, exercises }
    if (input.blocks !== undefined) {
      createInput.blocks = normalizeProgramBlocks(input.blocks, exercises.map((entry) => entry.exerciseSlug))
    }
    return repository.importWithExercises(() => createInput)
  }

  function updateProgram(id, input) {
    validateProgramInput(input, { partial: true })
    const existing = repository.getById(id)

    if (!existing) {
      return null
    }

    const updateInput = withoutInternalFields(input)

    if (Array.isArray(input.exercises)) {
      updateInput.exercises = validateProgramExercises(
        input.exercises
      )
    }

    // Blocks are checked against the exercise list the program ends up with.
    // An exercises-only update leaves existing blocks as they are.
    if (input.blocks !== undefined) {
      const exercises = updateInput.exercises ?? existing.exercises
      updateInput.blocks = normalizeProgramBlocks(input.blocks, exercises.map((entry) => entry.exerciseSlug))
    }

    return repository.importWithExercises(() => updateInput, id)
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
    createTemporaryProgram,
    updateProgram,
    deleteProgram,
    duplicateProgram,
    getProgramCount,
    requireProgram
  }
}
