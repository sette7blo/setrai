import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'

function createTestDatabase() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'setrai-test-')
  )

  const dbPath = path.join(directory, 'test.db')
  const db = openDatabase(dbPath)

  return {
    db,
    directory
  }
}

function cleanupDatabase(db, directory) {
  db.close()
  fs.rmSync(directory, {
    recursive: true,
    force: true
  })
}

test('creates and retrieves an exercise', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createExerciseService(db)

    const created = service.createExercise({
      name: 'Bench Press',
      muscle_group: 'chest',
      muscles: ['chest', 'triceps'],
      equipment: ['barbell', 'bench'],
      tags: ['strength'],
      instructions: ['Lower the bar', 'Press upward']
    })

    assert.equal(created.name, 'Bench Press')
    assert.equal(created.slug, 'bench-press')
    assert.equal(created.muscle_group, 'chest')

    assert.deepEqual(
      created.muscles,
      ['chest', 'triceps']
    )

    const loaded = service.getExercise(created.id)

    assert.equal(loaded.id, created.id)
    assert.equal(loaded.name, 'Bench Press')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('generates unique slugs', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createExerciseService(db)

    const first = service.createExercise({
      name: 'Bench Press'
    })

    const second = service.createExercise({
      name: 'Bench Press'
    })

    assert.equal(first.slug, 'bench-press')
    assert.equal(second.slug, 'bench-press-2')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('lists exercises alphabetically', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createExerciseService(db)

    service.createExercise({
      name: 'Squat'
    })

    service.createExercise({
      name: 'Bench Press'
    })

    service.createExercise({
      name: 'Deadlift'
    })

    const exercises = service.listExercises()

    assert.deepEqual(
      exercises.map((exercise) => exercise.name),
      [
        'Bench Press',
        'Deadlift',
        'Squat'
      ]
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('filters favourite exercises', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createExerciseService(db)

    const bench = service.createExercise({
      name: 'Bench Press'
    })

    service.createExercise({
      name: 'Squat'
    })

    service.setFavourite(
      bench.id,
      true
    )

    const favourites =
      service.listExercises({
        favourite: true
      })

    assert.equal(favourites.length, 1)
    assert.equal(favourites[0].name, 'Bench Press')
    assert.equal(favourites[0].favourite, true)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('searches exercises', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createExerciseService(db)

    service.createExercise({
      name: 'Bench Press',
      muscle_group: 'chest'
    })

    service.createExercise({
      name: 'Back Squat',
      muscle_group: 'legs'
    })

    const results =
      service.listExercises({
        search: 'chest'
      })

    assert.equal(results.length, 1)
    assert.equal(results[0].name, 'Bench Press')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates an exercise', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createExerciseService(db)

    const exercise = service.createExercise({
      name: 'Bench Press',
      default_rest: 120
    })

    const updated =
      service.updateExercise(
        exercise.id,
        {
          default_rest: 90,
          difficulty: 'intermediate'
        }
      )

    assert.equal(updated.default_rest, 90)
    assert.equal(
      updated.difficulty,
      'intermediate'
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('deletes an exercise', () => {
  const { db, directory } = createTestDatabase()

  try {
    const service = createExerciseService(db)

    const exercise = service.createExercise({
      name: 'Bench Press'
    })

    const removed =
      service.deleteExercise(
        exercise.id
      )

    assert.equal(removed, true)
    assert.equal(
      service.getExercise(exercise.id),
      null
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})
