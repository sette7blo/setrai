import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createBodyService } from '../src/server/body/service.js'
import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { createSessionService } from '../src/server/sessions/service.js'
import { createStatisticsService } from '../src/server/statistics/service.js'

const NOW = new Date('2026-10-05T12:00:00.000Z')

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
    body: createBodyService(db),
    exercises: createExerciseService(db),
    sessions: createSessionService(db),
    statistics: createStatisticsService(db, {
      now: () => NOW
    })
  }
}

function createExercise(services, input = {}) {
  return services.exercises.createExercise({
    name: input.name ?? 'Bench Press',
    muscle_group: input.muscleGroup ?? 'chest'
  })
}

function completeSession(
  services,
  {
    finishedAt = '2026-10-05 10:00:00',
    exercise,
    sets = []
  } = {}
) {
  const targetExercise = exercise ?? createExercise(services)
  const session = services.sessions.startSession({
    name: 'Stats Session'
  })

  for (const set of sets) {
    services.sessions.logSet(session.id, {
      exerciseId: targetExercise.id,
      setNumber: set.setNumber ?? 1,
      reps: set.reps,
      weight: set.weight,
      done: set.done ?? true
    })
  }

  return services.sessions.finishSession(session.id, {
    finishedAt
  })
}

test('returns empty statistics for a fresh database', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { statistics } = createServices(db)
    const overview = statistics.getOverview()

    assert.deepEqual(overview, {
      trainingFrequency: {
        totalSessions: 0,
        thisWeek: 0
      },
      totalVolume: 0,
      weeklyVolume: [],
      volumeByExercise: [],
      volumeByMuscle: [],
      personalRecords: [],
      trainingStreak: {
        currentStreakWeeks: 0,
        longestStreakWeeks: 0
      },
      bodyWeight: []
    })
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('counts completed sessions and ignores unfinished sessions', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const bench = createExercise(services)

    completeSession(services, {
      exercise: bench,
      finishedAt: '2026-10-05 10:00:00',
      sets: [{ reps: 8, weight: 100 }]
    })
    completeSession(services, {
      exercise: bench,
      finishedAt: '2026-09-30 10:00:00',
      sets: [{ reps: 8, weight: 100 }]
    })

    const unfinished = services.sessions.startSession({
      name: 'Unfinished'
    })
    services.sessions.logSet(unfinished.id, {
      exerciseId: bench.id,
      setNumber: 1,
      reps: 5,
      weight: 200
    })

    assert.deepEqual(
      services.statistics.getTrainingFrequency(),
      {
        totalSessions: 2,
        thisWeek: 1
      }
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('calculates volume, weekly volume, and exercise groups', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const bench = createExercise(services)
    const squat = createExercise(services, {
      name: 'Back Squat',
      muscleGroup: 'legs'
    })

    completeSession(services, {
      exercise: bench,
      finishedAt: '2026-10-05 10:00:00',
      sets: [
        { setNumber: 1, reps: 8, weight: 100 },
        { setNumber: 2, reps: 5, weight: 0 },
        { setNumber: 3, reps: 5, weight: null }
      ]
    })
    completeSession(services, {
      exercise: squat,
      finishedAt: '2026-09-30 10:00:00',
      sets: [{ reps: 5, weight: 120 }]
    })

    const overview = services.statistics.getOverview()

    assert.equal(overview.totalVolume, 1400)
    assert.deepEqual(overview.weeklyVolume, [
      {
        weekStart: '2026-09-28',
        volume: 600
      },
      {
        weekStart: '2026-10-05',
        volume: 800
      }
    ])
    assert.deepEqual(overview.volumeByExercise, [
      {
        exerciseSlug: 'back-squat',
        exerciseName: 'Back Squat',
        volume: 600
      },
      {
        exerciseSlug: 'bench-press',
        exerciseName: 'Bench Press',
        volume: 800
      }
    ])
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('aggregates muscle volume through the exercise service', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const bench = createExercise(services, {
      name: 'Bench Press',
      muscleGroup: 'chest'
    })
    const row = createExercise(services, {
      name: 'Cable Row',
      muscleGroup: 'back'
    })

    completeSession(services, {
      exercise: bench,
      sets: [{ reps: 8, weight: 100 }]
    })
    completeSession(services, {
      exercise: row,
      sets: [{ reps: 10, weight: 60 }]
    })

    assert.deepEqual(
      services.statistics.getVolumeByMuscle(),
      [
        { muscle: 'back', volume: 600 },
        { muscle: 'chest', volume: 800 }
      ]
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('calculates Epley estimated 1RM and personal records', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const bench = createExercise(services)

    completeSession(services, {
      exercise: bench,
      sets: [
        { setNumber: 1, reps: 12, weight: 100 },
        { setNumber: 2, reps: 3, weight: 120 }
      ]
    })

    const records = services.statistics.getPersonalRecords()

    assert.equal(records.length, 1)
    assert.equal(records[0].exerciseSlug, 'bench-press')
    assert.equal(records[0].maxWeight, 120)
    assert.ok(
      Math.abs(records[0].estimated1RM - 140) < 0.001
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('calculates weekly training streaks deterministically', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const bench = createExercise(services)

    assert.deepEqual(
      services.statistics.getTrainingStreak(),
      {
        currentStreakWeeks: 0,
        longestStreakWeeks: 0
      }
    )

    completeSession(services, {
      exercise: bench,
      finishedAt: '2026-10-05 10:00:00',
      sets: [{ reps: 8, weight: 100 }]
    })
    completeSession(services, {
      exercise: bench,
      finishedAt: '2026-09-30 10:00:00',
      sets: [{ reps: 8, weight: 100 }]
    })
    completeSession(services, {
      exercise: bench,
      finishedAt: '2026-09-16 10:00:00',
      sets: [{ reps: 8, weight: 100 }]
    })

    assert.deepEqual(
      services.statistics.getTrainingStreak(),
      {
        currentStreakWeeks: 2,
        longestStreakWeeks: 2
      }
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('returns body-weight history in chronological order', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    services.body.saveBodyWeight({
      date: '2026-10-05',
      weightKg: 82.1
    })
    services.body.saveBodyWeight({
      date: '2026-10-01',
      weightKg: 82.4
    })

    assert.deepEqual(
      services.statistics.getBodyWeightHistory(),
      [
        { date: '2026-10-01', weightKg: 82.4 },
        { date: '2026-10-05', weightKg: 82.1 }
      ]
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('preserves historical exercise display identity after rename', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    const bench = createExercise(services)

    completeSession(services, {
      exercise: bench,
      sets: [{ reps: 8, weight: 100 }]
    })

    services.exercises.updateExercise(bench.id, {
      name: 'Barbell Bench Press'
    })

    assert.deepEqual(
      services.statistics.getVolumeByExercise(),
      [
        {
          exerciseSlug: 'bench-press',
          exerciseName: 'Bench Press',
          volume: 800
        }
      ]
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('overview does not expose raw database field names', () => {
  const { db, directory } = createTestDatabase()

  try {
    const services = createServices(db)
    completeSession(services, {
      sets: [{ reps: 8, weight: 100 }]
    })

    const serialized = JSON.stringify(
      services.statistics.getOverview()
    )

    assert.equal(serialized.includes('finished_at'), false)
    assert.equal(serialized.includes('exercise_slug'), false)
    assert.equal(serialized.includes('weight_kg'), false)
  } finally {
    cleanupDatabase(db, directory)
  }
})
