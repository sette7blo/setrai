import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { createProgramService } from '../src/server/programs/service.js'
import { initializeDatabaseSeeds } from '../src/server/db/seed/seed.js'

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
      blocks: [{ type: 'straight', rounds: 4, steps: [{ exerciseSlug: 'bench-press', targetReps: '6-8' }] }],
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
    assert.deepEqual(created.blocks, [{ type: 'straight', rounds: 4, steps: [{ exerciseSlug: 'bench-press', targetReps: '6-8' }] }])
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
    const program = programs.createTemporaryProgram({
      name: 'JSON Program',
      tags: ['hypertrophy', 'home'],
      blocks: []
    })

    assert.deepEqual(
      program.tags,
      ['hypertrophy', 'home']
    )
    assert.deepEqual(program.blocks, [])
    assert.equal(program.isTemporary, true)
  } finally {
    cleanupDatabase(db, directory)
  }
})

function blockError(pattern) {
  return (error) => error.statusCode === 400 && pattern.test(error.message)
}

test('rejects malformed program blocks', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { exercises, programs } = createServices(db)
    const { bench } = seedExercises(exercises)
    const base = { name: 'Blocks', exercises: [{ exerciseId: bench.id, sets: 3, reps: '8' }] }
    const step = { exerciseSlug: 'bench-press' }
    const cases = [
      ['garbage', /blocks must be a list/],
      [[{ type: 'emom', rounds: 2 }], /intervals must be a list/],
      [[{ type: 'circuit', rounds: 2, steps: [step] }], /type must be/],
      [[{ type: 'straight', rounds: 0, steps: [step] }], /rounds must be/],
      [[{ type: 'straight', rounds: 2 }], /steps must be a list/],
      [[{ type: 'straight', rounds: 2, steps: [{}] }], /needs an exerciseSlug/],
      [[{ type: 'straight', rounds: 2, steps: [{ exerciseSlug: 'back-squat' }] }], /not in the program's exercises/],
      [[{ type: 'emom', rounds: 2, intervals: [{ durationSec: 0, steps: [step] }] }], /durationSec must be/],
      [[{ type: 'emom', rounds: 2, intervals: [{ durationSec: 30, steps: [{ ...step, targetDurationSec: 40 }] }] }], /targetDurationSec/],
      [[{ type: 'straight', rounds: 2, steps: [{ ...step, weight: 'heavy' }] }], /invalid weight/],
      [[{ type: 'straight', rounds: 2, steps: [{ ...step, notes: { a: 1 } }] }], /invalid notes/]
    ]
    for (const [blocks, pattern] of cases) {
      assert.throws(() => programs.createProgram({ ...base, blocks }), blockError(pattern), JSON.stringify(blocks))
    }
    assert.equal(programs.listPrograms().length, 0)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('update checks blocks against the resulting exercise list', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { exercises, programs } = createServices(db)
    const { bench, squat } = seedExercises(exercises)
    const program = programs.createProgram({ name: 'Swap', exercises: [{ exerciseId: bench.id, sets: 3, reps: '8' }] })
    const squatBlock = [{ type: 'straight', rounds: 2, steps: [{ exerciseSlug: 'back-squat' }] }]

    assert.throws(() => programs.updateProgram(program.id, { blocks: squatBlock }), blockError(/not in the program's exercises/))
    const updated = programs.updateProgram(program.id, { blocks: squatBlock, exercises: [{ exerciseId: squat.id, sets: 2, reps: '5' }] })
    assert.deepEqual(updated.blocks, squatBlock)
    assert.equal(updated.exercises[0].exerciseSlug, 'back-squat')
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('public create and update ignore internal program fields', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { programs } = createServices(db)
    const internal = { slug: 'chosen', isTemporary: true, seedKey: 'setrai.workout.x', seedRevision: 9, seedBaseline: { a: 1 } }
    const created = programs.createProgram({ name: 'Plain', ...internal })

    assert.equal(created.slug, 'plain')
    assert.equal(created.isTemporary, false)
    assert.equal(created.seedKey, null)
    assert.equal(created.seedRevision, 0)
    assert.equal(created.seedBaseline, null)

    const updated = programs.updateProgram(created.id, { name: 'Plain 2', ...internal })
    assert.equal(updated.name, 'Plain 2')
    assert.equal(updated.slug, 'plain')
    assert.equal(updated.isTemporary, false)
    assert.equal(updated.seedKey, null)
    assert.equal(programs.listPrograms().length, 1)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('a failed exercise list leaves the program unchanged', () => {
  const { db, directory } = createTestDatabase()

  try {
    const { exercises, programs } = createServices(db)
    const { bench } = seedExercises(exercises)
    const program = programs.createProgram({ name: 'Atomic', exercises: [{ exerciseId: bench.id, sets: 3, reps: '8' }] })

    assert.throws(() => programs.updateProgram(program.id, { name: 'Changed', exercises: [{ exerciseId: 99999, sets: 3, reps: '8' }] }))
    const loaded = programs.getProgram(program.id)
    assert.equal(loaded.name, 'Atomic')
    assert.equal(loaded.exercises.length, 1)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('every built-in program and a web-builder program pass block validation', () => {
  const { db, directory } = createTestDatabase()

  try {
    initializeDatabaseSeeds(db)
    const { programs } = createServices(db)
    const builtins = programs.listPrograms().filter((program) => program.seedKey)
    assert.equal(builtins.length, 7)

    for (const program of builtins) {
      const resaved = programs.updateProgram(program.id, { blocks: program.blocks })
      assert.deepEqual(resaved.blocks, program.blocks, program.name)
    }

    // Shape produced by buildProgramInput in src/client/workouts/builder-plan.ts.
    const [first, second, third] = builtins.flatMap((program) => program.exercises)
    const step = (entry, extra = {}) => ({ exerciseSlug: entry.exerciseSlug, exerciseName: entry.exerciseName, targetReps: '8-12', ...extra, weight: null, notes: '' })
    const blocks = [
      { type: 'straight', rounds: 3, restAfterRoundSec: 90, steps: [step(first), step(second)] },
      { type: 'emom', rounds: 5, intervals: [{ durationSec: 60, steps: [step(third, { targetDurationSec: 40 })] }], totalDurationSec: 300 }
    ]
    const built = programs.createProgram({
      name: 'Builder', description: '', difficulty: '', tags: [], blocks,
      exercises: [first, second, third].map((entry, position) => ({ exerciseId: entry.exerciseId, exerciseSlug: entry.exerciseSlug, position, sets: 3, reps: '8-12', restSeconds: 60, targetWeight: null, notes: '' }))
    })
    assert.deepEqual(built.blocks, blocks)
  } finally {
    cleanupDatabase(db, directory)
  }
})
