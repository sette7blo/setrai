import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { createProgramService } from '../src/server/programs/service.js'
import { createSessionService } from '../src/server/sessions/service.js'

function fixture(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-live-test-'))
  const db = openDatabase(path.join(directory, 'test.db'))
  try {
    const exercises = createExerciseService(db)
    const programs = createProgramService(db)
    const sessions = createSessionService(db)
    const exercise = exercises.createExercise({ name: 'Test Hold', instructions: ['Keep steady'] })
    const program = programs.createProgram({ name: 'Timed workout', exercises: [{ exerciseId: exercise.id, sets: 2, reps: '20s' }],
      blocks: [{ type: 'emom', rounds: 2, intervals: [{ durationSec: 60, steps: [{ exerciseSlug: exercise.slug, targetDurationSec: 20 }] }] }] })
    const session = sessions.startSession({ programId: program.id })
    run({ db, exercises, programs, sessions, exercise, program, session })
  } finally { db.close(); fs.rmSync(directory, { recursive: true, force: true }) }
}

test('session snapshots survive program editing and deletion', () => fixture(({ sessions, programs, exercises, program, exercise, session }) => {
  programs.updateProgram(program.id, { name: 'Changed', exercises: [] })
  exercises.updateExercise(exercise.id, { name: 'Changed hold' })
  programs.deleteProgram(program.id)
  const loaded = sessions.getSession(session.id)
  assert.equal(loaded.programName, 'Timed workout')
  assert.equal(loaded.plannedExercises[0].exerciseName, 'Test Hold')
  assert.deepEqual(loaded.plannedExercises[0].exercise.instructions, ['Keep steady'])
  assert.equal(loaded.blocks[0].intervals[0].steps[0].targetDurationSec, 20)
  const logged = sessions.logSet(session.id, { exerciseId: exercise.id, setNumber: 1, reps: 8 })
  assert.equal(logged.exerciseName, 'Test Hold')
}))

test('live clock, rest deadline and extra sets survive a new service instance', () => fixture(({ db, sessions, session, exercise }) => {
  const state = { mode: 'emom', exerciseIndex: 0, setCounts: { [exercise.slug]: 4 }, restEndsAt: Date.now() + 15000,
    restDurationSec: 30, restNextIndex: 0, emomStartedAt: Date.now(), emomPositionSec: 60, emomActiveSec: 20, emomRunningSince: null }
  sessions.updateLiveState(session.id, state)
  assert.deepEqual(createSessionService(db).getSession(session.id).runtime, state)
  assert.throws(() => sessions.updateLiveState(session.id, { emomPositionSec: -1 }), /Invalid session timer/)
  assert.throws(() => sessions.updateLiveState(session.id, { mode: 'unknown' }), /Invalid training mode/)
  assert.throws(() => sessions.updateLiveState(session.id, { setCounts: { x: 101 } }), /Invalid set count/)
  assert.throws(() => sessions.updateLiveState(session.id, { plan: {} }), /Unknown live session field/)
}))

test('timed interval logs store actual work and retry without duplicate sets', () => fixture(({ sessions, session, exercise }) => {
  const input = { exerciseId: exercise.id, setNumber: 1, reps: 0, weight: null, done: true,
    durationSec: 20, blockIndex: 0, roundIndex: 0, intervalIndex: 0, stepIndex: 0 }
  const logged = sessions.logSet(session.id, input)
  assert.equal(logged.reps, 0)
  assert.equal(logged.durationSec, 20)
  assert.equal(sessions.logSet(session.id, input).id, logged.id)
  assert.equal(sessions.getSession(session.id).sets.length, 1)
  const updated = sessions.updateSet(session.id, logged.id, { durationSec: 18, weight: 5 })
  assert.equal(updated.durationSec, 18)
  assert.equal(updated.intervalIndex, 0)
  assert.throws(() => sessions.logSet(session.id, { ...input, intervalIndex: 99 }), /Exercise does not match/)
  assert.throws(() => sessions.logSet(session.id, { ...input, durationSec: 70 }), /exceeds the interval/)
  assert.throws(() => sessions.logSet(session.id, { ...input, durationSec: -2 }), /Invalid timed set/)
  assert.throws(() => sessions.logSet(session.id, { exerciseId: exercise.id, setNumber: 2, reps: 0 }), /Reps are invalid/)
}))

test('discard removes active sessions and sets but protects completed history', () => fixture(({ db, sessions, session, exercise }) => {
  sessions.logSet(session.id, { exerciseId: exercise.id, setNumber: 1, reps: 8 })
  sessions.discardSession(session.id)
  assert.equal(sessions.getSession(session.id), null)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM session_sets WHERE session_id = ?').get(session.id).count, 0)
  const completed = sessions.startSession({ name: 'Completed' })
  sessions.finishSession(completed.id)
  assert.throws(() => sessions.discardSession(completed.id), /cannot be discarded/)
  assert.throws(() => sessions.updateLiveState(completed.id, { exerciseIndex: 1 }), /already finished/)
  assert.throws(() => sessions.logSet(completed.id, { exerciseId: exercise.id, setNumber: 1, reps: 8 }), /already finished/)
}))
