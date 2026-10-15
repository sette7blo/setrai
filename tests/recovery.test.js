import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { createProgramService } from '../src/server/programs/service.js'
import { getExerciseMuscleLoads } from '../src/server/recovery/muscle-map.js'
import { createRecoveryService } from '../src/server/recovery/service.js'
import { createSessionService } from '../src/server/sessions/service.js'

const NOW = new Date('2026-10-05T18:00:00.000Z')

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

function createServices(db, now = NOW) {
  return {
    exercises: createExerciseService(db),
    programs: createProgramService(db),
    sessions: createSessionService(db),
    recovery: createRecoveryService(db, {
      now: () => now
    })
  }
}

function createExercise(services, input = {}) {
  return services.exercises.createExercise({
    name: input.name ?? 'Bench Press',
    muscle_group: input.muscleGroup ?? 'chest',
    muscles: input.muscles ?? []
  })
}

function completeSession(
  services,
  {
    exercise,
    finishedAt = '2026-10-05 18:00:00',
    setCount = 1,
    reps = 8,
    weight = 100
  } = {}
) {
  const targetExercise = exercise ?? createExercise(services)
  const session = services.sessions.startSession({
    name: 'Recovery Session'
  })

  for (let index = 1; index <= setCount; index += 1) {
    services.sessions.logSet(session.id, {
      exerciseId: targetExercise.id,
      setNumber: index,
      reps,
      weight,
      done: true
    })
  }

  return services.sessions.finishSession(session.id, {
    finishedAt
  })
}

function getMuscle(recovery, muscle) {
  return recovery.muscles.find((item) =>
    item.muscle === muscle
  )
}

test('returns empty recovery for a fresh database', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { recovery } = createServices(db)
    const result = recovery.getRecovery()

    assert.equal(result.generatedAt, NOW.toISOString())
    assert.equal(result.lookbackDays, 7)
    assert.deepEqual(result.muscles, [])
    assert.equal(JSON.stringify(result).includes('NaN'), false)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('recent completed workout lowers trained muscle recovery', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    completeSession(services)

    const chest = getMuscle(
      services.recovery.getRecovery(),
      'chest'
    )

    assert.equal(chest.recovery, 0)
    assert.equal(chest.status, 'recovering')
    assert.equal(chest.lastTrainedAt, NOW.toISOString())
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('recovery increases as time decays training fatigue', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    completeSession(services, {
      finishedAt: '2026-10-05 18:00:00'
    })

    const atZero = createRecoveryService(db, {
      now: () => new Date('2026-10-05T18:00:00.000Z')
    }).getMuscleRecovery('chest')
    const atDay = createRecoveryService(db, {
      now: () => new Date('2026-10-06T18:00:00.000Z')
    }).getMuscleRecovery('chest')
    const atLater = createRecoveryService(db, {
      now: () => new Date('2026-10-08T18:00:00.000Z')
    }).getMuscleRecovery('chest')

    assert.ok(atZero.recovery < atDay.recovery)
    assert.ok(atDay.recovery < atLater.recovery)
    assert.equal(atZero.status, 'recovering')
    assert.equal(atDay.status, 'recovering')
    assert.equal(atLater.status, 'ready')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('more sets create slower recovery than fewer sets', () => {
  const single = createTestDatabase()
  const multiple = createTestDatabase()

  try {
    const oneSetServices = createServices(
      single.db,
      new Date('2026-10-06T18:00:00.000Z')
    )
    completeSession(oneSetServices, {
      setCount: 1,
      finishedAt: '2026-10-05 18:00:00'
    })

    const fourSetServices = createServices(
      multiple.db,
      new Date('2026-10-06T18:00:00.000Z')
    )
    completeSession(fourSetServices, {
      setCount: 4,
      finishedAt: '2026-10-05 18:00:00'
    })

    const oneSet = oneSetServices.recovery
      .getMuscleRecovery('chest')
    const fourSets = fourSetServices.recovery
      .getMuscleRecovery('chest')

    assert.ok(fourSets.recovery < oneSet.recovery)
  } finally {
    cleanupDatabase(single.db, single.directory)
    cleanupDatabase(multiple.db, multiple.directory)
  }
})

test('maps primary and secondary muscles deterministically', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const bench = createExercise(services, {
      muscleGroup: 'chest',
      muscles: ['triceps', 'front delts']
    })

    completeSession(services, { exercise: bench })

    assert.deepEqual(
      services.recovery.getRecovery().muscles.map((item) => item.muscle),
      ['anterior-deltoid', 'chest', 'triceps']
    )
    assert.equal(
      getMuscle(services.recovery.getRecovery(), 'back'),
      undefined
    )
    const nextDay = createRecoveryService(db, {
      now: () => new Date('2026-10-06T18:00:00.000Z')
    }).getRecovery()
    assert.ok(
      getMuscle(nextDay, 'chest').recovery <
      getMuscle(nextDay, 'triceps').recovery
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('primary muscles receive full load and secondary muscles receive partial load', () => {
  assert.deepEqual(getExerciseMuscleLoads({
    muscle_group: 'chest',
    muscles: ['triceps', 'front delts', 'chest']
  }), [
    { muscle: 'anterior-deltoid', factor: 0.5 },
    { muscle: 'chest', factor: 1 },
    { muscle: 'triceps', factor: 0.5 }
  ])
})

test('multiple recent sessions accumulate fatigue', () => {
  const single = createTestDatabase()
  const repeated = createTestDatabase()

  try {
    const singleServices = createServices(
      single.db,
      new Date('2026-10-06T18:00:00.000Z')
    )
    completeSession(singleServices, {
      finishedAt: '2026-10-05 18:00:00'
    })

    const repeatedServices = createServices(
      repeated.db,
      new Date('2026-10-06T18:00:00.000Z')
    )
    const exercise = createExercise(repeatedServices)
    completeSession(repeatedServices, {
      exercise,
      finishedAt: '2026-10-05 18:00:00'
    })
    completeSession(repeatedServices, {
      exercise,
      finishedAt: '2026-10-04 18:00:00'
    })

    assert.ok(
      repeatedServices.recovery.getMuscleRecovery('chest').recovery <
      singleServices.recovery.getMuscleRecovery('chest').recovery
    )
  } finally {
    cleanupDatabase(single.db, single.directory)
    cleanupDatabase(repeated.db, repeated.directory)
  }
})

test('unfinished sessions do not affect recovery', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const bench = createExercise(services)
    const session = services.sessions.startSession({
      name: 'Unfinished'
    })

    services.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 1,
      reps: 8,
      weight: 100
    })

    assert.deepEqual(
      services.recovery.getRecovery().muscles,
      []
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('deleted or unknown exercise metadata does not crash recovery', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const bench = createExercise(services)
    const unknown = createExercise(services, {
      name: 'Mystery Lift',
      muscleGroup: '',
      muscles: []
    })

    completeSession(services, { exercise: bench })
    completeSession(services, { exercise: unknown })
    services.exercises.deleteExercise(bench.id)

    const result = services.recovery.getRecovery()
    assert.deepEqual(result.muscles, [])
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('recovery values are clamped within bounds', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(
      db,
      new Date('2026-10-06T18:00:00.000Z')
    )
    completeSession(services, {
      setCount: 40,
      finishedAt: '2026-10-05 18:00:00'
    })

    const chest = services.recovery.getMuscleRecovery('chest')
    assert.ok(chest.recovery >= 0)
    assert.ok(chest.recovery <= 1)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('maps recovery statuses at deterministic thresholds', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    completeSession(services, {
      weight: null,
      reps: 10,
      finishedAt: '2026-10-05 18:00:00'
    })

    const recovering = createRecoveryService(db, {
      now: () => new Date('2026-10-06T00:00:00.000Z')
    }).getMuscleRecovery('chest')
    const moderate = createRecoveryService(db, {
      now: () => new Date('2026-10-07T06:00:00.000Z')
    }).getMuscleRecovery('chest')
    const ready = createRecoveryService(db, {
      now: () => new Date('2026-10-08T06:00:00.000Z')
    }).getMuscleRecovery('chest')

    assert.equal(recovering.status, 'recovering')
    assert.equal(moderate.status, 'moderate')
    assert.equal(ready.status, 'ready')
  } finally {
    cleanupDatabase(db, directory)
  }
})
