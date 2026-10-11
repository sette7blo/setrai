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
import { normalizeLiveState, normalizeSetContext, validateSetLocation } from './live-state.js'

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
      notes: input.notes ?? '',
      plan: {
        exercises: program.exercises.map((entry) => ({ ...entry, exercise: exerciseService.getExercise(entry.exerciseId) })),
        blocks: program.blocks ?? []
      }
    })

    return {
      ...session,
      plannedExercises: session.plan.exercises,
      blocks: session.plan.blocks
    }
  }

  function getSession(id) {
    const session = repository.getById(id)

    if (session?.plan) return { ...session, plannedExercises: session.plan.exercises, blocks: session.plan.blocks }
    if (!session || !session.programId) {
      return session
    }

    const program = programService.getProgram(session.programId)

    return {
      ...session,
      plannedExercises: program?.exercises ?? [],
      blocks: program?.blocks ?? []
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
    const session = requireSession(sessionId)
    if (session.finishedAt) throw clientError('Session is already finished', 409)
    const context = normalizeSetContext(input)
    const setInput = normalizeSetInput(input)
    const exercise = resolveExercise(input, session)
    validateSetLocation(context, getSession(sessionId), exercise.slug)
    if (context.blockIndex !== undefined) {
      const existing = session.sets.find((set) => set.exerciseId === exercise.id && set.setNumber === setInput.setNumber && set.blockIndex === context.blockIndex && set.intervalIndex === context.intervalIndex && set.roundIndex === context.roundIndex && set.stepIndex === context.stepIndex)
      if (existing) return existing
    }

    return repository.insertSet(sessionId, {
      ...setInput,
      context,
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

  function resolveExercise(input, session) {
    const exerciseId = validatePositiveInteger(
      input.exerciseId,
      'Exercise ID is invalid'
    )
    const exercise = exerciseService.getExercise(exerciseId)
    const planned = session.plan?.exercises.find((entry) => entry.exerciseId === exerciseId)
    if (planned) return { id: exercise?.id ?? null, slug: planned.exerciseSlug, name: planned.exerciseName }

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
      reps: input.durationSec > 0 && (input.reps === null || input.reps === 0) ? 0 : validatePositiveInteger(input.reps, 'Reps are invalid'),
      weight: validateOptionalNonNegativeNumber(
        input.weight,
        'Weight is invalid'
      ),
      done: input.done !== false
    }
  }

  function normalizeSetUpdate(input) {
    const result = {}
    if ('durationSec' in input) result.durationSec = normalizeSetContext(input).durationSec

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
    finishSession,
    updateLiveState(id, input) {
      const session = requireSession(id)
      if (session.finishedAt) throw clientError('Session is already finished', 409)
      repository.saveRuntime(id, normalizeLiveState(input, session.runtime))
      return getSession(id)
    },
    discardSession(id) {
      const session = requireSession(id)
      if (session.finishedAt) throw clientError('Completed sessions cannot be discarded', 409)
      return repository.remove(id)
    }
  }
}
