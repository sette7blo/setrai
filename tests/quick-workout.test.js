import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { seedBuiltinExercises } from '../src/server/db/seed/seed.js'
import { createProgramService } from '../src/server/programs/service.js'
import { createQuickWorkoutService } from '../src/server/quick-workout/service.js'
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

function exercise(input) {
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    status: input.status ?? 'active',
    muscle_group: input.muscle ?? 'chest',
    muscles: input.muscles ?? [],
    equipment: input.equipment ?? [],
    default_sets: input.defaultSets ?? 3,
    default_reps: input.defaultReps ?? '8-12',
    default_rest: input.defaultRest ?? 90
  }
}

function makeService(db, options = {}) {
  return createQuickWorkoutService(db, {
    exerciseService: {
      listExercises: () => options.exercises ?? []
    },
    profileService: {
      getEquipment: () => options.equipment ?? [],
      getTrainingGoal: () => options.goal ?? ''
    },
    recoveryService: {
      getRecovery: () => ({
        generatedAt: '2026-10-05T18:00:00.000Z',
        muscles: options.recovery ?? []
      })
    },
    programService: options.programService,
    sessionService: options.sessionService ?? {
      listCompletedSessions: () => options.sessions ?? []
    }
  })
}

function runWithDb(callback) {
  const { db, directory } = createTestDatabase()

  try {
    callback(db)
  } finally {
    cleanupDatabase(db, directory)
  }
}

const library = [
  exercise({
    id: 1,
    slug: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    muscle: 'chest',
    equipment: ['dumbbells', 'bench']
  }),
  exercise({
    id: 2,
    slug: 'goblet-squat',
    name: 'Goblet Squat',
    muscle: 'legs',
    equipment: ['dumbbells']
  }),
  exercise({
    id: 3,
    slug: 'push-up',
    name: 'Push Up',
    muscle: 'chest',
    equipment: ['bodyweight']
  }),
  exercise({
    id: 4,
    slug: 'cable-row',
    name: 'Cable Row',
    muscle: 'back',
    equipment: ['cable-machine']
  }),
  exercise({
    id: 5,
    slug: 'plank',
    name: 'Plank',
    muscle: 'core',
    equipment: []
  })
]

test('generates a deterministic workout with required fields', () => {
  runWithDb((db) => {
    const service = makeService(db, {
      exercises: library,
      equipment: ['dumbbells', 'bench'],
      goal: 'hypertrophy'
    })

    const workout = service.generate({
      durationMinutes: 30
    })

    assert.equal(workout.name, 'Quick Workout')
    assert.equal(workout.durationMinutes, 30)
    assert.equal(workout.goal, 'hypertrophy')
    assert.ok(workout.exercises.length <= 4)
    assert.ok(workout.exercises.length > 0)
    assert.deepEqual(Object.keys(workout.exercises[0]), [
      'exerciseId',
      'exerciseSlug',
      'exerciseName',
      'muscleGroup',
      'sets',
      'reps',
      'restSec'
    ])
  })
})

test('filters unavailable equipment and keeps bodyweight/no-equipment eligible', () => {
  runWithDb((db) => {
    const service = makeService(db, {
      exercises: library,
      equipment: ['bench']
    })
    const workout = service.generate({
      durationMinutes: 30
    })
    const slugs = workout.exercises.map((item) => item.exerciseSlug)

    assert.equal(slugs.includes('goblet-squat'), false)
    assert.equal(slugs.includes('cable-row'), false)
    assert.equal(slugs.includes('push-up'), true)
    assert.equal(slugs.includes('plank'), true)
  })
})

test('empty profile equipment means unrestricted equipment', () => {
  runWithDb((db) => {
    const workout = makeService(db, {
      exercises: library,
      equipment: []
    }).generate({ durationMinutes: 30 })

    assert.ok(
      workout.exercises.some((item) =>
        item.exerciseSlug === 'cable-row'
      )
    )
  })
})

test('prefers ready or absent-recovery muscles over recovering muscles', () => {
  runWithDb((db) => {
    const workout = makeService(db, {
      exercises: library,
      equipment: [],
      recovery: [
        { muscle: 'chest', recovery: 0.1, status: 'recovering' }
      ]
    }).generate({ durationMinutes: 15 })

    assert.notEqual(
      workout.exercises[0].exerciseSlug,
      'dumbbell-bench-press'
    )
  })
})

test('keeps a shorter ready-only plan instead of falling back to tired muscles', () => {
  runWithDb(db => {
    const workout = makeService(db, {
      exercises: [
        exercise({ id: 1, slug: 'ready', name: 'Ready', muscle: 'legs' }),
        exercise({ id: 2, slug: 'moderate', name: 'Moderate', muscle: 'back' }),
        exercise({ id: 3, slug: 'recovering', name: 'Recovering', muscle: 'chest' })
      ],
      recovery: [
        { muscle: 'legs', recovery: 0.8 },
        { muscle: 'back', recovery: 0.5 },
        { muscle: 'chest', recovery: 0.1 }
      ]
    }).generate({ durationMinutes: 30 })
    assert.equal(workout.recoveryFallback, 'ready')
    assert.equal(workout.estimatedDurationMinutes, 9)
    assert.deepEqual(workout.exercises.map(item => item.exerciseSlug), ['ready'])
  })
})

test('does not generate a workout when all eligible muscles need recovery', () => {
  runWithDb(db => {
    const service = makeService(db, {
      exercises: [exercise({ id: 1, slug: 'push-up', name: 'Push Up' })],
      recovery: [{ muscle: 'chest', recovery: 0.79 }]
    })
    assert.throws(() => service.generate({ durationMinutes: 30 }), /No ready muscle groups/)
  })
})

test('goal prescriptions differ deterministically', () => {
  runWithDb((db) => {
    const exercises = [library[0]]
    const strength = makeService(db, {
      exercises,
      goal: 'strength'
    }).generate({ durationMinutes: 15 }).exercises[0]
    const hypertrophy = makeService(db, {
      exercises,
      goal: 'hypertrophy'
    }).generate({ durationMinutes: 15 }).exercises[0]
    const endurance = makeService(db, {
      exercises,
      goal: 'endurance'
    }).generate({ durationMinutes: 15 }).exercises[0]

    assert.notEqual(strength.reps, hypertrophy.reps)
    assert.notEqual(hypertrophy.reps, endurance.reps)
    assert.ok(strength.restSec > endurance.restSec)
  })
})

test('general fitness uses exercise defaults where sensible', () => {
  runWithDb((db) => {
    const workout = makeService(db, {
      exercises: [exercise({
        id: 1,
        slug: 'custom',
        name: 'Custom',
        defaultSets: 2,
        defaultReps: '6-10',
        defaultRest: 50
      })],
      goal: 'general-fitness'
    }).generate({ durationMinutes: 15 })

    assert.equal(workout.exercises[0].sets, 2)
    assert.equal(workout.exercises[0].reps, '6-10')
    assert.equal(workout.exercises[0].restSec, 50)
  })
})

test('same inputs produce stable ordering and slug tie-breakers', () => {
  runWithDb((db) => {
    const exercises = [
      exercise({ id: 1, slug: 'b-lift', name: 'Same' }),
      exercise({ id: 2, slug: 'a-lift', name: 'Same' })
    ]
    const service = makeService(db, { exercises })

    const first = service.generate({ durationMinutes: 15 })
    const second = service.generate({ durationMinutes: 15 })

    assert.deepEqual(first, second)
    assert.equal(first.exercises[0].exerciseSlug, 'a-lift')
  })
})

test('previously completed exercise is preferred within its ready group', () => {
  runWithDb((db) => {
    const exercises = [
      exercise({ id: 1, slug: 'bench', name: 'Bench', muscle: 'chest' }),
      exercise({ id: 2, slug: 'fly', name: 'Fly', muscle: 'chest' })
    ]
    const workout = makeService(db, {
      exercises,
      sessions: [{
        sets: [{ exerciseSlug: 'bench', done: true }]
      }]
    }).generate({ durationMinutes: 15 })

    assert.equal(workout.exercises[0].exerciseSlug, 'bench')
  })
})

test('target muscles strongly influence selection', () => {
  runWithDb((db) => {
    const workout = makeService(db, {
      exercises: library
    }).generate({
      durationMinutes: 15,
      targetMuscles: ['back']
    })

    assert.equal(workout.exercises[0].exerciseSlug, 'cable-row')
  })
})

test('fails clearly when no eligible exercises remain', () => {
  runWithDb((db) => {
    const service = makeService(db, {
      exercises: [library[3]],
      equipment: ['dumbbells']
    })

    assert.throws(
      () => service.generate({ durationMinutes: 30 }),
      /No ready muscle groups/
    )
  })
})

test('validates duration, goal, target muscles, and malformed input', () => {
  runWithDb((db) => {
    const service = makeService(db, {
      exercises: library
    })

    assert.throws(
      () => service.generate({ durationMinutes: 0 }),
      /Duration must be between 15 and 90 minutes/
    )
    assert.throws(
      () => service.generate({ durationMinutes: 120 }),
      /Duration must be between 15 and 90 minutes/
    )
    assert.throws(
      () => service.generate({ goal: 'powerbuilding' }),
      /Invalid quick-workout goal/
    )
    assert.throws(
      () => service.generate({ targetMuscles: 'chest' }),
      /targetMuscles must be an array/
    )
    assert.throws(
      () => service.generate(null),
      /Quick Workout request must be an object/
    )
  })
})


test('starts generated Quick Workout as temporary Program-backed Session', () => {
  const { db, directory } = createTestDatabase()

  try {
    seedBuiltinExercises(db)
    const service = createQuickWorkoutService(db)
    const result = service.start({ durationMinutes: 15 })
    const programs = createProgramService(db)
    const sessions = createSessionService(db)
    const loaded = sessions.getSession(result.session.id)

    assert.equal(result.program.isTemporary, true)
    assert.equal(loaded.programId, result.program.id)
    assert.equal(loaded.plannedExercises.length, result.workout.exercises.length)
    assert.equal(programs.listPrograms().some((program) => program.id === result.program.id), false)
    assert.equal(programs.getProgram(result.program.id).isTemporary, true)
  } finally {
    cleanupDatabase(db, directory)
  }
})

test('starts exact Quick Workout preview without relying on client-only Session state', () => {
  runWithDb((db) => {
    const created = []
    const service = makeService(db, {
      exercises: library,
      programService: {
        createProgram: (input) => {
          created.push(input)
          return { id: 12, ...input }
        }
      },
      sessionService: {
        startSession: (input) => ({ id: 14, programId: input.programId, plannedExercises: created[0].exercises, sets: [] }),
        listCompletedSessions: () => []
      }
    })
    const workout = service.generate({ durationMinutes: 15, targetMuscles: ['back'] })
    const result = service.start({ workout })

    assert.equal(created[0].isTemporary, true)
    assert.equal(created[0].exercises[0].exerciseId, workout.exercises[0].exerciseId)
    assert.equal(result.session.programId, 12)
  })
})
