import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiClient } from '../../src/client/shared/api/client.js'
import {
  finishSession,
  logSessionSet,
  startProgramSession,
  updateSessionSet
} from '../../src/client/workouts/api.js'
import {
  normalizeProgram,
  normalizeProgramExercise,
  programSummary
} from '../../src/client/workouts/format.js'
import {
  completedSetCount,
  currentSetNumber,
  firstIncompleteExerciseIndex,
  plannedSetsRemaining,
  sessionProgress,
  simpleVolume,
  totalPlannedSets
} from '../../src/client/workouts/session-logic.js'
import {
  addRestSeconds,
  createRestTimer,
  formatRestTime,
  skipRestTimer,
  tickRestTimer
} from '../../src/client/workouts/rest-timer.js'
import { summaryFacts } from '../../src/client/workouts/session-summary.js'
import type { Program, Session } from '../../src/client/workouts/types.js'

test('normalizes and orders Program exercises', () => {
  const program = normalizeProgram({
    id: 1,
    slug: 'upper-a',
    name: 'Upper A',
    description: 'Press day',
    difficulty: 'intermediate',
    tags: ['strength'],
    exercises: [
      { exerciseId: 2, exerciseSlug: 'row', exerciseName: 'Row', position: 2 },
      { exercise_id: 1, exercise_slug: 'bench-press', exercise_name: 'Bench Press', position: 1, rest_sec: 120, weight: 80 }
    ]
  })

  assert.equal(program.name, 'Upper A')
  assert.equal(program.exercises[0].exerciseSlug, 'bench-press')
  assert.equal(program.exercises[0].restSec, 120)
  assert.equal(program.exercises[0].weight, 80)
  assert.equal(programSummary(program), '2 exercises · Intermediate')
})

test('normalizes rest aliases in Program Exercise payloads', () => {
  assert.equal(normalizeProgramExercise({ exerciseId: 1, restSeconds: 75 }).restSec, 75)
  assert.equal(normalizeProgramExercise({ exerciseId: 1, restSec: 60 }).restSec, 60)
})

test('Session API sends start Program payload', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string, init?: RequestInit }> = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify({ session: { id: 7, programId: 3, programName: 'Upper A', sets: [] } }), { status: 201 })
    }
    const session = await startProgramSession(3, new ApiClient())
    assert.equal(session.id, 7)
    assert.equal(calls[0].url, '/api/sessions')
    assert.equal(calls[0].init?.method, 'POST')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { programId: 3 })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Session API sends log, update, and finish contracts', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string, init?: RequestInit }> = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      if (String(url).endsWith('/finish')) {
        return new Response(JSON.stringify({ session: { id: 9, programName: 'Upper A', finishedAt: 'now', sets: [] } }), { status: 200 })
      }
      return new Response(JSON.stringify({ set: { id: 2, sessionId: 9, exerciseId: 4, setNumber: 1, reps: 10, weight: 32.5, done: true } }), { status: 200 })
    }

    await logSessionSet(9, { exerciseId: 4, setNumber: 1, reps: 10, weight: 32.5, done: true }, new ApiClient())
    await updateSessionSet(9, 2, { reps: 9, weight: 35, done: true, setNumber: 1 }, new ApiClient())
    await finishSession(9, 'Felt good', new ApiClient())

    assert.equal(calls[0].url, '/api/sessions/9/sets')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { exerciseId: 4, setNumber: 1, reps: 10, weight: 32.5, done: true })
    assert.equal(calls[1].url, '/api/sessions/9/sets/2')
    assert.equal(calls[1].init?.method, 'PATCH')
    assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { reps: 9, weight: 35, done: true, setNumber: 1 })
    assert.equal(calls[2].url, '/api/sessions/9/finish')
    assert.deepEqual(JSON.parse(String(calls[2].init?.body)), { notes: 'Felt good' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

function program(): Program {
  return normalizeProgram({
    id: 1,
    slug: 'upper-a',
    name: 'Upper A',
    exercises: [
      { exerciseId: 10, exerciseName: 'Bench Press', exerciseSlug: 'bench-press', position: 0, sets: 2 },
      { exerciseId: 11, exerciseName: 'Row', exerciseSlug: 'row', position: 1, sets: 1 }
    ]
  })
}

function session(): Session {
  return {
    id: 5,
    programId: 1,
    programName: 'Upper A',
    startedAt: '',
    finishedAt: null,
    notes: '',
    plannedExercises: [],
    sets: [
      { id: 1, sessionId: 5, exerciseId: 10, exerciseSlug: 'bench-press', exerciseName: 'Bench Press', setNumber: 1, reps: 8, weight: 100, done: true, loggedAt: '' }
    ]
  }
}

test('live Session logic selects current set and exercise progression', () => {
  const p = program()
  const s = session()
  assert.equal(totalPlannedSets(p), 3)
  assert.equal(completedSetCount(s), 1)
  assert.equal(currentSetNumber(s, p.exercises[0]), 2)
  assert.equal(firstIncompleteExerciseIndex(s, p), 0)
  s.sets.push({ id: 2, sessionId: 5, exerciseId: 10, exerciseSlug: 'bench-press', exerciseName: 'Bench Press', setNumber: 2, reps: 7, weight: 100, done: true, loggedAt: '' })
  assert.equal(firstIncompleteExerciseIndex(s, p), 1)
  assert.equal(plannedSetsRemaining(s, p), 1)
  assert.equal(sessionProgress(s, p), '1 / 2 exercises · 2 / 3 sets')
})

test('rest timer handles duration, ticks, +/-15, skip, and floor at zero', () => {
  let timer = createRestTimer(90)
  assert.deepEqual(timer, { remainingSec: 90, running: true })
  timer = tickRestTimer(timer, 15)
  assert.equal(timer.remainingSec, 75)
  timer = addRestSeconds(timer, 15)
  assert.equal(timer.remainingSec, 90)
  timer = addRestSeconds(timer, -200)
  assert.deepEqual(timer, { remainingSec: 0, running: false })
  assert.deepEqual(skipRestTimer(), { remainingSec: 0, running: false })
  assert.equal(formatRestTime(77), '01:17')
})

test('Session summary reports logged set count and simple volume', () => {
  const s = session()
  assert.equal(simpleVolume(s), 800)
  assert.deepEqual(summaryFacts(s, program()), ['Upper A', '1 sets logged', '800 kg total volume'])
})
