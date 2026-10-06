import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { createProgramService } from '../src/server/programs/service.js'
import { createSessionService } from '../src/server/sessions/service.js'

function createTestDatabase() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'setrai-test-')
  )
  const db = openDatabase(
    path.join(directory, 'test.db')
  )

  return { db, directory }
}

function cleanupDatabase(db, directory) {
  db.close()
  fs.rmSync(directory, {
    recursive: true,
    force: true
  })
}

function createServices(db) {
  return {
    exercises: createExerciseService(db),
    programs: createProgramService(db),
    sessions: createSessionService(db)
  }
}

function seedProgram(services) {
  const bench = services.exercises.createExercise({
    name: 'Bench Press'
  })
  const squat = services.exercises.createExercise({
    name: 'Back Squat'
  })
  const program = services.programs.createProgram({
    name: 'Upper Body A',
    exercises: [
      {
        exerciseId: bench.id,
        position: 1
      },
      {
        exerciseId: squat.id,
        position: 2
      }
    ]
  })

  return { bench, squat, program }
}

test('starts a session from a valid program and preserves program name', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const { program } = seedProgram(services)

    const session = services.sessions.startSession({
      programId: program.id
    })

    assert.equal(session.programId, program.id)
    assert.equal(session.programName, 'Upper Body A')
    assert.equal(session.finishedAt, null)
    assert.deepEqual(
      session.plannedExercises.map((exercise) => exercise.exerciseSlug),
      ['bench-press', 'back-squat']
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('rejects a missing program when starting a session', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { sessions } = createServices(db)

    assert.throws(
      () => sessions.startSession({ programId: 9999 }),
      /Program not found/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('starts an ad-hoc session', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { sessions } = createServices(db)
    const session = sessions.startSession({
      name: 'Quick Workout'
    })

    assert.equal(session.programId, null)
    assert.equal(session.programName, 'Quick Workout')
    assert.deepEqual(session.sets, [])
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('logs a set and snapshots exercise identity', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const { bench, program } = seedProgram(services)
    const session = services.sessions.startSession({
      programId: program.id
    })

    const loggedSet = services.sessions.logSet(
      session.id,
      {
        exerciseId: bench.id,
        setNumber: 1,
        reps: 8,
        weight: 100,
        done: true
      }
    )

    assert.equal(loggedSet.exerciseId, bench.id)
    assert.equal(loggedSet.exerciseSlug, 'bench-press')
    assert.equal(loggedSet.exerciseName, 'Bench Press')
    assert.equal(loggedSet.setNumber, 1)
    assert.equal(loggedSet.reps, 8)
    assert.equal(loggedSet.weight, 100)
    assert.equal(loggedSet.done, true)

    const loaded = services.sessions.getSession(session.id)
    assert.equal(loaded.sets.length, 1)
    assert.equal(loaded.sets[0].exerciseName, 'Bench Press')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('returns logged sets in deterministic order', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const { bench } = seedProgram(services)
    const session = services.sessions.startSession({
      name: 'Quick Workout'
    })

    services.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 2,
      reps: 7,
      weight: 100
    })
    services.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 1,
      reps: 8,
      weight: 95
    })

    const loaded = services.sessions.getSession(session.id)

    assert.deepEqual(
      loaded.sets.map((set) => set.id),
      loaded.sets.map((set) => set.id).sort((a, b) => a - b)
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates reps, weight, completion state, and set number', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const { bench } = seedProgram(services)
    const session = services.sessions.startSession({
      name: 'Quick Workout'
    })
    const loggedSet = services.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 1,
      reps: 8,
      weight: 100,
      done: true
    })

    const updated = services.sessions.updateSet(
      session.id,
      loggedSet.id,
      {
        setNumber: 2,
        reps: 9,
        weight: 102.5,
        done: false
      }
    )

    assert.equal(updated.setNumber, 2)
    assert.equal(updated.reps, 9)
    assert.equal(updated.weight, 102.5)
    assert.equal(updated.done, false)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('rejects updating a set through another session URL', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const { bench } = seedProgram(services)
    const firstSession = services.sessions.startSession({
      name: 'First'
    })
    const secondSession = services.sessions.startSession({
      name: 'Second'
    })
    const loggedSet = services.sessions.logSet(
      firstSession.id,
      {
        exerciseId: bench.id,
        setNumber: 1,
        reps: 8
      }
    )

    assert.throws(
      () => services.sessions.updateSet(
        secondSession.id,
        loggedSet.id,
        { reps: 9 }
      ),
      /Session set not found/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('deletes a set', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const { bench } = seedProgram(services)
    const session = services.sessions.startSession({
      name: 'Quick Workout'
    })
    const loggedSet = services.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 1,
      reps: 8
    })

    assert.equal(
      services.sessions.deleteSet(session.id, loggedSet.id),
      true
    )
    assert.equal(
      services.sessions.getSession(session.id).sets.length,
      0
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('rejects deleting a set through another session URL', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const { bench } = seedProgram(services)
    const firstSession = services.sessions.startSession({
      name: 'First'
    })
    const secondSession = services.sessions.startSession({
      name: 'Second'
    })
    const loggedSet = services.sessions.logSet(
      firstSession.id,
      {
        exerciseId: bench.id,
        setNumber: 1,
        reps: 8
      }
    )

    assert.throws(
      () => services.sessions.deleteSet(
        secondSession.id,
        loggedSet.id
      ),
      /Session set not found/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('finishes a session and preserves logged sets', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const { bench } = seedProgram(services)
    const session = services.sessions.startSession({
      name: 'Quick Workout'
    })
    services.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 1,
      reps: 8
    })

    const finished = services.sessions.finishSession(
      session.id,
      { notes: 'Felt strong' }
    )

    assert.ok(finished.finishedAt)
    assert.equal(finished.notes, 'Felt strong')
    assert.equal(finished.sets.length, 1)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('lists sessions with newest first', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { sessions } = createServices(db)
    const first = sessions.startSession({ name: 'First' })
    const second = sessions.startSession({ name: 'Second' })

    const history = sessions.listSessions()

    assert.deepEqual(
      history.map((session) => session.id),
      [second.id, first.id]
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('preserves historical program and exercise identity after renames', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const { bench, program } = seedProgram(services)
    const session = services.sessions.startSession({
      programId: program.id
    })

    services.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 1,
      reps: 8,
      weight: 100
    })

    services.programs.updateProgram(program.id, {
      name: 'Renamed Program'
    })
    services.exercises.updateExercise(bench.id, {
      name: 'Renamed Bench Press'
    })

    const loaded = services.sessions.getSession(session.id)

    assert.equal(loaded.programName, 'Upper Body A')
    assert.equal(loaded.sets[0].exerciseName, 'Bench Press')
    assert.equal(loaded.sets[0].exerciseSlug, 'bench-press')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('validates missing exercise and malformed set values', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { sessions } = createServices(db)
    const session = sessions.startSession({
      name: 'Quick Workout'
    })

    assert.throws(
      () => sessions.logSet(session.id, {
        exerciseId: 999,
        setNumber: 1,
        reps: 8
      }),
      /Exercise not found/
    )

    assert.throws(
      () => sessions.logSet(session.id, {
        exerciseId: 1,
        setNumber: 0,
        reps: -1
      }),
      /Set number is invalid/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})
