import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { createProgramService } from '../src/server/programs/service.js'

function createTestDatabase() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'setrai-test-')
  )

  const db = openDatabase(
    path.join(directory, 'test.db')
  )

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

function createServices(db) {
  return {
    exercises: createExerciseService(db),
    programs: createProgramService(db)
  }
}

function seedExercises(exercises) {
  const bench = exercises.createExercise({
    name: 'Bench Press',
    muscle_group: 'chest'
  })

  const squat = exercises.createExercise({
    name: 'Back Squat',
    muscle_group: 'legs'
  })

  return {
    bench,
    squat
  }
}

test('creates and retrieves a program', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { exercises, programs } = createServices(db)
    const { bench } = seedExercises(exercises)

    const created = programs.createProgram({
      name: 'Upper Body A',
      description: 'Pressing day',
      difficulty: 'intermediate',
      tags: ['strength'],
      blocks: [{ name: 'Main' }],
      exercises: [
        {
          exerciseId: bench.id,
          sets: 4,
          reps: '6-8',
          restSeconds: 120,
          targetWeight: 80,
          notes: 'Pause first rep'
        }
      ]
    })

    assert.equal(created.slug, 'upper-body-a')
    assert.equal(created.isTemporary, false)
    assert.deepEqual(created.tags, ['strength'])
    assert.deepEqual(created.blocks, [{ name: 'Main' }])
    assert.equal(created.exercises.length, 1)
    assert.equal(
      created.exercises[0].exerciseSlug,
      'bench-press'
    )
    assert.equal(created.exercises[0].targetWeight, 80)

    const loaded = programs.getProgram(created.id)
    assert.deepEqual(loaded, created)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('retrieves a program by slug', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { programs } = createServices(db)
    const created = programs.createProgram({
      name: 'Upper Body A'
    })

    assert.equal(
      programs.getProgramBySlug('upper-body-a').id,
      created.id
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('generates unique program slugs', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { programs } = createServices(db)

    const first = programs.createProgram({
      name: 'Upper Body A'
    })
    const second = programs.createProgram({
      name: 'Upper Body A'
    })

    assert.equal(first.slug, 'upper-body-a')
    assert.equal(second.slug, 'upper-body-a-2')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('orders program exercises by position', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { exercises, programs } = createServices(db)
    const { bench, squat } = seedExercises(exercises)

    const program = programs.createProgram({
      name: 'Strength Day',
      exercises: [
        {
          exerciseId: squat.id,
          position: 2
        },
        {
          exerciseId: bench.id,
          position: 1
        }
      ]
    })

    assert.deepEqual(
      program.exercises.map((exercise) => exercise.exerciseSlug),
      ['bench-press', 'back-squat']
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('updates a program and its exercises', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { exercises, programs } = createServices(db)
    const { bench, squat } = seedExercises(exercises)
    const program = programs.createProgram({
      name: 'Draft Program',
      exercises: [{ exerciseId: bench.id }]
    })

    const updated = programs.updateProgram(
      program.id,
      {
        name: 'Lower Body A',
        difficulty: 'beginner',
        tags: ['legs'],
        exercises: [
          {
            exerciseSlug: squat.slug,
            sets: 5,
            reps: '5',
            restSeconds: 180
          }
        ]
      }
    )

    assert.equal(updated.name, 'Lower Body A')
    assert.equal(updated.slug, 'draft-program')
    assert.deepEqual(updated.tags, ['legs'])
    assert.equal(updated.exercises.length, 1)
    assert.equal(
      updated.exercises[0].exerciseId,
      squat.id
    )
    assert.equal(updated.exercises[0].sets, 5)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('duplicates a program', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { exercises, programs } = createServices(db)
    const { bench } = seedExercises(exercises)
    const program = programs.createProgram({
      name: 'Upper Body A',
      exercises: [{ exerciseId: bench.id }]
    })

    const duplicate = programs.duplicateProgram(program.id)

    assert.notEqual(duplicate.id, program.id)
    assert.equal(duplicate.name, 'Upper Body A Copy')
    assert.equal(duplicate.slug, 'upper-body-a-copy')
    assert.equal(duplicate.exercises.length, 1)
    assert.equal(
      duplicate.exercises[0].exerciseSlug,
      'bench-press'
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('deletes a program', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { programs } = createServices(db)
    const program = programs.createProgram({
      name: 'Upper Body A'
    })

    assert.equal(
      programs.deleteProgram(program.id),
      true
    )
    assert.equal(
      programs.getProgram(program.id),
      null
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('rejects invalid exercise references', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { programs } = createServices(db)

    assert.throws(
      () => programs.createProgram({
        name: 'Broken Program',
        exercises: [{ exerciseId: 9999 }]
      }),
      /invalid exercise reference/
    )
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('converts JSON fields at the repository boundary', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { programs } = createServices(db)
    const program = programs.createProgram({
      name: 'JSON Program',
      tags: ['hypertrophy', 'home'],
      blocks: [
        {
          name: 'Superset',
          rounds: 3
        }
      ],
      isTemporary: true
    })

    assert.deepEqual(
      program.tags,
      ['hypertrophy', 'home']
    )
    assert.deepEqual(
      program.blocks,
      [{ name: 'Superset', rounds: 3 }]
    )
    assert.equal(program.isTemporary, true)
  } finally {
    cleanupDatabase(db, directory)
  }
})
