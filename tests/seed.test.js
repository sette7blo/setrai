import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import {
  BUILTIN_EXERCISES
} from '../src/server/db/seed/exercises/index.js'
import {
  initializeDatabaseSeeds,
  validateBuiltinExercises
} from '../src/server/db/seed/seed.js'
import {
  createExerciseService
} from '../src/server/exercises/service.js'
import {
  createProfileService
} from '../src/server/profile/service.js'
import {
  createQuickWorkoutService
} from '../src/server/quick-workout/service.js'
import {
  createRecoveryService
} from '../src/server/recovery/service.js'
import {
  createSessionService
} from '../src/server/sessions/service.js'
import {
  createStatisticsService
} from '../src/server/statistics/service.js'

function createTestDatabase(options = {}) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'setrai-seed-test-')
  )
  const db = openDatabase(
    path.join(directory, 'test.db'),
    options
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

function createSeededDatabase() {
  return createTestDatabase({
    seed: true
  })
}

function services(db) {
  return {
    exercises: createExerciseService(db),
    profile: createProfileService(db),
    quickWorkout: createQuickWorkoutService(db),
    recovery: createRecoveryService(db, {
      now: () => new Date('2026-10-05T12:00:00.000Z')
    }),
    sessions: createSessionService(db),
    statistics: createStatisticsService(db, {
      now: () => new Date('2026-10-05T12:00:00.000Z')
    })
  }
}

function countAllExercises(db) {
  return Number(
    db.prepare(`
      SELECT COUNT(*) AS count
      FROM exercises
    `).get().count
  )
}

function countDuplicateSlugs(db) {
  return Number(
    db.prepare(`
      SELECT COUNT(*) AS count
      FROM (
        SELECT slug
        FROM exercises
        GROUP BY slug
        HAVING COUNT(*) > 1
      ) duplicates
    `).get().count
  )
}

test('seed dataset validates and contains a useful library', () => {
  assert.equal(validateBuiltinExercises(), true)
  assert.equal(BUILTIN_EXERCISES.length, 56)

  const muscleGroups = new Set(
    BUILTIN_EXERCISES.map((exercise) =>
      exercise.muscle_group
    )
  )

  for (const muscle of [
    'chest',
    'back',
    'quadriceps',
    'hamstrings',
    'glutes',
    'calves',
    'shoulders',
    'biceps',
    'triceps',
    'forearms',
    'core'
  ]) {
    assert.equal(
      muscleGroups.has(muscle),
      true,
      `${muscle} should be covered`
    )
  }
})

test('fresh database seeds representative built-in exercises', () => {
  const { db, directory } = createSeededDatabase()

  try {
    const service = createExerciseService(db)
    const exercises = service.listExercises()

    assert.equal(exercises.length, BUILTIN_EXERCISES.length)

    for (const slug of [
      'bench-press',
      'incline-dumbbell-press',
      'push-up',
      'back-squat',
      'romanian-deadlift',
      'lat-pulldown',
      'plank'
    ]) {
      assert.ok(
        service.getExerciseBySlug(slug),
        `${slug} should exist`
      )
    }
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('seeding is idempotent and does not duplicate slugs', () => {
  const { db, directory } = createSeededDatabase()

  try {
    const before = countAllExercises(db)
    const result = initializeDatabaseSeeds(db)
    const after = countAllExercises(db)

    assert.equal(before, BUILTIN_EXERCISES.length)
    assert.equal(after, before)
    assert.equal(result.exercises.inserted, 0)
    assert.equal(result.exercises.existing, before)
    assert.equal(countDuplicateSlugs(db), 0)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('seed does not overwrite user-edited built-in exercises', () => {
  const { db, directory } = createSeededDatabase()

  try {
    const service = createExerciseService(db)
    const bench = service.getExerciseBySlug('bench-press')

    service.updateExercise(bench.id, {
      name: 'My Bench Press',
      default_rest: 45
    })

    initializeDatabaseSeeds(db)

    const loaded = service.getExerciseBySlug('bench-press')
    assert.equal(loaded.name, 'My Bench Press')
    assert.equal(loaded.default_rest, 45)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('existing database keeps user exercises and receives missing built-ins', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createExerciseService(db)
    service.createExercise({
      slug: 'garage-sled-push',
      name: 'Garage Sled Push',
      muscle_group: 'quadriceps',
      muscles: ['glutes'],
      equipment: ['machine'],
      status: 'active'
    })

    initializeDatabaseSeeds(db)

    assert.ok(
      service.getExerciseBySlug('garage-sled-push')
    )
    assert.ok(service.getExerciseBySlug('bench-press'))
    assert.equal(
      countAllExercises(db),
      BUILTIN_EXERCISES.length + 1
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('representative seed records contain training metadata and stable image paths', () => {
  const { db, directory } = createSeededDatabase()

  try {
    const service = createExerciseService(db)

    for (const slug of [
      'bench-press',
      'one-arm-dumbbell-row',
      'goblet-squat',
      'triceps-pushdown',
      'plank'
    ]) {
      const exercise = service.getExerciseBySlug(slug)

      assert.ok(exercise.muscle_group)
      assert.ok(exercise.equipment.length > 0)
      assert.ok(exercise.difficulty)
      assert.ok(exercise.instructions.length >= 3)
      assert.ok(exercise.default_sets > 0)
      assert.ok(exercise.default_reps)
      assert.ok(exercise.default_rest > 0)
      assert.equal(exercise.source_type, 'builtin')
      assert.equal(exercise.status, 'active')
      assert.equal(
        exercise.image_url,
        `/images/exercises/${slug}.webp`
      )
    }
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('seeded library supports Quick Workout equipment profiles', () => {
  const { db, directory } = createSeededDatabase()

  try {
    const app = services(db)

    const unrestricted = app.quickWorkout.generate({
      durationMinutes: 30
    })
    assert.ok(unrestricted.exercises.length >= 4)

    app.profile.updateProfile({
      equipment: ['dumbbells', 'bench']
    })
    const dumbbellWorkout = app.quickWorkout.generate({
      durationMinutes: 30
    })
    assert.ok(dumbbellWorkout.exercises.length >= 4)
    const dumbbellSlugs = dumbbellWorkout.exercises.map(
      (exercise) => exercise.exerciseSlug
    )
    assert.equal(
      dumbbellSlugs.some((slug) =>
        ['cable-fly', 'lat-pulldown', 'leg-press'].includes(slug)
      ),
      false
    )

    app.profile.updateProfile({
      equipment: ['bodyweight']
    })
    const bodyweightWorkout = app.quickWorkout.generate({
      durationMinutes: 30
    })
    assert.ok(bodyweightWorkout.exercises.length >= 4)

    app.profile.updateProfile({
      equipment: ['barbell', 'bench']
    })
    const barbellWorkout = app.quickWorkout.generate({
      durationMinutes: 30
    })
    assert.ok(barbellWorkout.exercises.length >= 4)
    const barbellSlugs = barbellWorkout.exercises.map(
      (exercise) => exercise.exerciseSlug
    )
    assert.equal(
      barbellSlugs.some((slug) =>
        ['dumbbell-curl', 'lat-pulldown', 'leg-press'].includes(slug)
      ),
      false
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('seeded bench press metadata is compatible with Recovery', () => {
  const { db, directory } = createSeededDatabase()

  try {
    const app = services(db)
    const bench = app.exercises.getExerciseBySlug('bench-press')
    const session = app.sessions.startSession({
      name: 'Seed Recovery Session'
    })

    app.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 1,
      reps: 8,
      weight: 100,
      done: true
    })
    app.sessions.finishSession(session.id)

    const recovery = app.recovery.getRecovery()
    const muscles = recovery.muscles.map((item) => item.muscle)

    assert.equal(muscles.includes('chest'), true)
    assert.equal(muscles.includes('triceps'), true)
    assert.equal(
      muscles.filter((muscle) => muscle === 'chest').length,
      1
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('seeded exercises work with Statistics aggregation and records', () => {
  const { db, directory } = createSeededDatabase()

  try {
    const app = services(db)
    const bench = app.exercises.getExerciseBySlug('bench-press')
    const session = app.sessions.startSession({
      name: 'Seed Statistics Session'
    })

    app.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 1,
      reps: 8,
      weight: 100,
      done: true
    })
    app.sessions.logSet(session.id, {
      exerciseId: bench.id,
      setNumber: 2,
      reps: 5,
      weight: 110,
      done: true
    })
    app.sessions.finishSession(session.id)

    const statistics = app.statistics.getOverview()

    assert.equal(statistics.totalVolume, 1350)
    assert.equal(
      statistics.volumeByExercise[0].exerciseSlug,
      'bench-press'
    )
    assert.equal(
      statistics.volumeByMuscle[0].muscle,
      'chest'
    )
    assert.equal(
      statistics.personalRecords[0].exerciseSlug,
      'bench-press'
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})
