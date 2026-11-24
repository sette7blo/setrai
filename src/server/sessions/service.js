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
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw clientError('Session request must be an object', 400)
    }
    if (input.programId !== undefined && input.programId !== null) {
      return startProgramSession(input)
    }

    return repository.create({
      programId: null,
      programName: normalizeSessionName(input.name),
      notes: normalizeFinishNotes(input.notes) ?? ''
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

    const plannedExercises = program.exercises.map((entry) => {
      const lastSet = repository.latestCompletedSet(entry.exerciseSlug)
      return {
        ...entry,
        targetWeight: entry.targetWeight ?? lastSet?.weight ?? null,
        // Captured in the plan so a reload or a later session cannot change it.
        lastPerformance: repository.lastPerformance(entry.exerciseSlug),
        exercise: exerciseService.getExercise(entry.exerciseId)
      }
    })
    const session = repository.create({
      programId: program.id,
      programName: program.name,
      notes: normalizeFinishNotes(input.notes) ?? '',
      plan: {
        exercises: plannedExercises,
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

  // No query keeps the original contract (newest 50, no sets) for the plugin
  // and the Today page. includeSets returns History's shape: sets plus the
  // planned exercises, with each embedded exercise cut to what History reads.
  function listSessions(query = {}) {
    const { from, to, limit, includeSets } = normalizeListQuery(query)
    if (!from && !to && limit === 50 && !includeSets) return repository.list({ limit })
    const sessions = repository.listWithSets({ startedFrom: from, startedBefore: to && nextDay(to), limit, withSets: includeSets })
    if (!includeSets) return sessions
    const programs = new Map()
    return sessions.map(({ plan, ...session }) => {
      let planned = plan
      if (!planned && session.programId) {
        if (!programs.has(session.programId)) programs.set(session.programId, programService.getProgram(session.programId))
        planned = programs.get(session.programId)
      }
      return {
        ...session,
        plannedExercises: (planned?.exercises ?? []).map(({ exercise, ...entry }) => (
          exercise ? { ...entry, exercise: { id: exercise.id, slug: exercise.slug, name: exercise.name, muscle_group: exercise.muscle_group, muscles: exercise.muscles } } : entry
        )),
        blocks: planned?.blocks ?? []
      }
    })
  }

  function normalizeListQuery(query) {
    const date = (value, name) => {
      if (value === undefined || value === null || value === '') return null
      const time = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN
      const valid = !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value
      if (!valid) throw clientError(`${name} must be a date (YYYY-MM-DD)`, 400)
      return value
    }
    const from = date(query.from, 'from')
    const to = date(query.to, 'to')
    if (from && to && from > to) throw clientError('from must not be after to', 400)
    let limit = from || to ? null : 50
    if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
      if (query.limit === 'all') limit = null
      else {
        limit = Number(query.limit)
        if (!/^\d+$/.test(String(query.limit)) || limit < 1 || limit > 100000) throw clientError('limit must be a number from 1 to 100000, or "all"', 400)
      }
    }
    if (![undefined, null, '', '0', '1'].includes(query.includeSets)) throw clientError('includeSets must be 0 or 1', 400)
    return { from, to, limit, includeSets: query.includeSets === '1' }
  }

  function nextDay(date) {
    return new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
  }

  // Newest first. limit counts finished sessions; finishedAfter is a stored
  // UTC time or date prefix ('YYYY-MM-DD'), compared as text.
  function listCompletedSessions({ limit = null, finishedAfter = null } = {}) {
    return repository.listWithSets({ finishedOnly: true, limit, finishedAfter })
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

  // Finishing again without a time keeps the recorded finish, so a retry or a
  // double submit cannot move a past workout; an explicit time still corrects it.
  function finishSession(id, input) {
    const session = requireSession(id)
    const body = input && typeof input === 'object' ? input : {}
    const finishedAt = normalizeFinishedAt(body.finishedAt)
    if (finishedAt && toTime(finishedAt) < toTime(session.startedAt)) {
      throw clientError('Finish time cannot be before the session started', 400)
    }
    const finished = repository.finish(id, {
      finishedAt,
      notes: normalizeFinishNotes(body.notes)
    })
    programService.removeUnusedTemporaryPrograms()
    return finished
  }

  function normalizeSessionName(value) {
    if (value === undefined || value === null) return 'Ad-hoc Session'
    if (typeof value !== 'string' || value.length > 200) {
      throw clientError('Session name must be text of at most 200 characters', 400)
    }
    return value
  }

  // Stored times are UTC 'YYYY-MM-DD HH:MM:SS' without a zone marker.
  function toTime(value) {
    return Date.parse(`${value.replace(' ', 'T')}Z`)
  }

  function normalizeFinishNotes(value) {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string' || value.length > 5000) {
      throw clientError('Notes must be text of at most 5000 characters', 400)
    }
    return value
  }

  // An explicit finish time is how a session's length gets corrected, so it
  // must be a real UTC clock value in the stored format.
  function normalizeFinishedAt(value) {
    if (value === undefined || value === null) return null
    const valid = typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value.replace(' ', 'T')}Z`))
    if (!valid) throw clientError('Finish time is invalid', 400)
    return value
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
    listFinishedExerciseSets: (slug) => repository.listFinishedExerciseSets(slug),
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
      const removed = repository.remove(id)
      programService.removeUnusedTemporaryPrograms()
      return removed
    }
  }
}
