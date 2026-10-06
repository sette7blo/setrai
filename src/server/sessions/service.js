// src/server/sessions/service.js

import {
  createSessionRepository
} from '../db/repositories/sessions.js'
import {
  createExerciseService
} from '../exercises/service.js'
import {
  createProgramService
} from '../programs/service.js'

function clientError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function validatePositiveInteger(value, message) {
  const number = Number(value)

  if (!Number.isInteger(number) || number <= 0) {
    throw clientError(message, 400)
  }

  return number
}

function validateOptionalNonNegativeNumber(value, message) {
  if (value === undefined || value === null) {
    return null
  }

  const number = Number(value)

  if (!Number.isFinite(number) || number < 0) {
    throw clientError(message, 400)
  }

  return number
}

export function createSessionService(db) {
  const repository = createSessionRepository(db)
  const exerciseService = createExerciseService(db)
  const programService = createProgramService(db)

  function startSession(input = {}) {
    if (input.programId !== undefined && input.programId !== null) {
      return startProgramSession(input)
    }

    return repository.create({
      programId: null,
      programName: input.name ?? 'Ad-hoc Session',
      notes: input.notes ?? ''
    })
  }

  function startProgramSession(input) {
    const programId = validatePositiveInteger(
      input.programId,
      'Program ID is invalid'
    )
    const program = programService.getProgram(programId)

    if (!program) {
      throw clientError('Program not found', 404)
    }

    const session = repository.create({
      programId: program.id,
      programName: program.name,
      notes: input.notes ?? ''
    })

    return {
      ...session,
      plannedExercises: program.exercises
    }
  }

  function getSession(id) {
    const session = repository.getById(id)

    if (!session || !session.programId) {
      return session
    }

    const program = programService.getProgram(session.programId)

    return {
      ...session,
      plannedExercises: program?.exercises ?? []
    }
  }

  function listSessions(filters = {}) {
    return repository.list(filters)
  }

  function listCompletedSessions(filters = {}) {
    return repository
      .list({
        limit: filters.limit ?? 500
      })
      .filter((session) => session.finishedAt)
      .map((session) => repository.getById(session.id))
  }

  function logSet(sessionId, input) {
    requireSession(sessionId)
    const setInput = normalizeSetInput(input)
    const exercise = resolveExercise(input)

    return repository.insertSet(sessionId, {
      ...setInput,
      exerciseId: exercise.id,
      exerciseSlug: exercise.slug,
      exerciseName: exercise.name
    })
  }

  function updateSet(sessionId, setId, input) {
    requireSession(sessionId)

    if (!repository.getSet(sessionId, setId)) {
      throw clientError('Session set not found', 404)
    }

    const updateInput = normalizeSetUpdate(input)
    return repository.updateSet(
      sessionId,
      setId,
      updateInput
    )
  }

  function deleteSet(sessionId, setId) {
    requireSession(sessionId)

    const removed = repository.deleteSet(
      sessionId,
      setId
    )

    if (!removed) {
      throw clientError('Session set not found', 404)
    }

    return true
  }

  function finishSession(id, input = {}) {
    requireSession(id)
    return repository.finish(id, input)
  }

  function requireSession(id) {
    const session = repository.getById(id)

    if (!session) {
      throw clientError('Session not found', 404)
    }

    return session
  }

  function resolveExercise(input) {
    const exerciseId = validatePositiveInteger(
      input.exerciseId,
      'Exercise ID is invalid'
    )
    const exercise = exerciseService.getExercise(exerciseId)

    if (!exercise) {
      throw clientError('Exercise not found', 404)
    }

    return exercise
  }

  function normalizeSetInput(input) {
    return {
      setNumber: validatePositiveInteger(
        input.setNumber,
        'Set number is invalid'
      ),
      reps: validatePositiveInteger(
        input.reps,
        'Reps are invalid'
      ),
      weight: validateOptionalNonNegativeNumber(
        input.weight,
        'Weight is invalid'
      ),
      done: input.done !== false
    }
  }

  function normalizeSetUpdate(input) {
    const result = {}

    if ('setNumber' in input) {
      result.setNumber = validatePositiveInteger(
        input.setNumber,
        'Set number is invalid'
      )
    }

    if ('reps' in input) {
      result.reps = validatePositiveInteger(
        input.reps,
        'Reps are invalid'
      )
    }

    if ('weight' in input) {
      result.weight = validateOptionalNonNegativeNumber(
        input.weight,
        'Weight is invalid'
      )
    }

    if ('done' in input) {
      result.done = Boolean(input.done)
    }

    return result
  }

  return {
    startSession,
    getSession,
    listSessions,
    listCompletedSessions,
    logSet,
    updateSet,
    deleteSet,
    finishSession
  }
}
