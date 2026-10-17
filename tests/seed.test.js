import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { createProgramService } from '../src/server/programs/service.js'
import { createProfileService } from '../src/server/profile/service.js'
import { createQuickWorkoutService } from '../src/server/quick-workout/service.js'
import { createRecoveryService } from '../src/server/recovery/service.js'
import { createSessionService } from '../src/server/sessions/service.js'
import { createStatisticsService } from '../src/server/statistics/service.js'
import {
  BUILTIN_EXERCISES,
  BUILTIN_PROGRAMS,
  initializeDatabaseSeeds,
  validateBuiltinExercises
} from '../src/server/db/seed/seed.js'

function createTestDatabase(options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-seed-test-'))
  const db = openDatabase(path.join(directory, 'test.db'), options)
  return { db, directory }
}

function cleanupDatabase(db, directory) {
  db.close()
  fs.rmSync(directory, { recursive: true, force: true })
}

function counts(db) {
  return {
    exercises: Number(db.prepare('SELECT COUNT(*) AS count FROM exercises').get().count),
    programs: Number(db.prepare('SELECT COUNT(*) AS count FROM programs').get().count)
  }
}

const clone = value => structuredClone(value)

test('bundled seed manifest is complete, local, and internally consistent', () => {
  assert.equal(validateBuiltinExercises(), true)
  assert.equal(BUILTIN_EXERCISES.length, 56)
  assert.equal(BUILTIN_PROGRAMS.length, 7)
  assert.equal(BUILTIN_PROGRAMS.reduce((sum, program) => sum + program.exercises.length, 0), 32)
  assert.equal(new Set(BUILTIN_EXERCISES.map(seed => seed.seedKey)).size, 56)
  assert.equal(new Set(BUILTIN_PROGRAMS.map(seed => seed.seedKey)).size, 7)
  const exerciseKeys = new Set(BUILTIN_EXERCISES.map(seed => seed.seedKey))
  for (const seed of BUILTIN_EXERCISES) {
    assert.equal(seed.revision, 1)
    assert.match(seed.seedKey, /^setrai\.exercise\./)
    assert.equal(seed.source_type, 'builtin')
    assert.match(seed.image_url, /^\/images\/exercises\/seed\/.+\.webp$/)
    assert.equal(fs.existsSync(path.join('public', seed.image_url)), true, seed.image_url)
  }
  for (const seed of BUILTIN_PROGRAMS) {
    assert.equal(seed.revision, 1)
    assert.match(seed.seedKey, /^setrai\.workout\./)
    for (const entry of seed.exercises) assert.equal(exerciseKeys.has(entry.exerciseSeedKey), true)
  }
})

test('fresh database seeds 56 exercises, 7 workouts, and 32 resolved references', () => {
  const { db, directory } = createTestDatabase({ seed: true })
  try {
    assert.deepEqual(counts(db), { exercises: 56, programs: 7 })
    assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM exercises WHERE seed_key IS NOT NULL AND seed_revision = 1').get().count), 56)
    assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM programs WHERE seed_key IS NOT NULL AND seed_revision = 1').get().count), 7)
    const refs = db.prepare('SELECT exercise_id FROM program_exercises').all()
    assert.equal(refs.length, 32)
    assert.equal(refs.every(row => Number.isInteger(row.exercise_id) && row.exercise_id > 0), true)
    assert.equal(Number(db.prepare(`SELECT COUNT(*) AS count FROM program_exercises pe LEFT JOIN exercises e ON e.id = pe.exercise_id WHERE e.id IS NULL`).get().count), 0)
  } finally { cleanupDatabase(db, directory) }
})

test('seed reconciliation is idempotent and older or equal revisions are no-ops', () => {
  const { db, directory } = createTestDatabase({ seed: true })
  try {
    const before = counts(db)
    const result = initializeDatabaseSeeds(db)
    assert.deepEqual(counts(db), before)
    assert.equal(result.exercises.unchanged, 56)
    assert.equal(result.programs.unchanged, 7)
    assert.equal(result.exercises.inserted + result.programs.inserted, 0)
  } finally { cleanupDatabase(db, directory) }
})

test('partial databases receive missing seeds without losing user records', () => {
  const { db, directory } = createTestDatabase()
  try {
    createExerciseService(db).createExercise({
      slug: 'garage-sled-push', name: 'Garage Sled Push', muscle_group: 'quadriceps',
      muscles: ['glutes'], equipment: ['machine'], status: 'active'
    })
    const result = initializeDatabaseSeeds(db)
    assert.deepEqual(counts(db), { exercises: 57, programs: 7 })
    assert.equal(result.exercises.inserted, 56)
    assert.ok(createExerciseService(db).getExerciseBySlug('garage-sled-push'))
  } finally { cleanupDatabase(db, directory) }
})

test('legacy rows with canonical slugs are adopted rather than duplicated or overwritten', () => {
  const { db, directory } = createTestDatabase()
  try {
    const seed = BUILTIN_EXERCISES.find(item => item.slug === 'pushups')
    createExerciseService(db).createExercise({ ...seed, name: 'My Pushups' })
    const result = initializeDatabaseSeeds(db)
    const adopted = createExerciseService(db).getExerciseBySlug('pushups')
    assert.deepEqual(counts(db), { exercises: 56, programs: 7 })
    assert.equal(result.exercises.adopted, 1)
    assert.equal(adopted.name, 'My Pushups')
    assert.equal(adopted.seed_key, seed.seedKey)
    assert.equal(adopted.seed_revision, 1)
  } finally { cleanupDatabase(db, directory) }
})

test('new seed revisions update untouched fields and preserve local exercise edits', () => {
  const { db, directory } = createTestDatabase({ seed: true })
  try {
    const service = createExerciseService(db)
    const exercise = service.getExerciseBySlug('pushups')
    service.updateExercise(exercise.id, { name: 'My Pushups' })
    const exercises = clone(BUILTIN_EXERCISES)
    const next = exercises.find(item => item.slug === 'pushups')
    next.revision = 2
    next.name = 'Seed Renamed Pushups'
    next.description = 'Revision two description.'
    const result = initializeDatabaseSeeds(db, { exercises, programs: BUILTIN_PROGRAMS })
    const updated = service.getExercise(exercise.id)
    assert.equal(result.exercises.updated, 1)
    assert.equal(updated.name, 'My Pushups')
    assert.equal(updated.description, 'Revision two description.')
    assert.equal(updated.seed_revision, 2)
    initializeDatabaseSeeds(db)
    assert.equal(service.getExercise(exercise.id).description, 'Revision two description.')
  } finally { cleanupDatabase(db, directory) }
})

test('new workout revisions preserve edited fields while updating untouched fields', () => {
  const { db, directory } = createTestDatabase({ seed: true })
  try {
    const service = createProgramService(db)
    const program = service.listPrograms().find(item => item.slug === 'upper')
    service.updateProgram(program.id, { name: 'My Upper Workout' })
    const programs = clone(BUILTIN_PROGRAMS)
    const next = programs.find(item => item.slug === 'upper')
    next.revision = 2
    next.name = 'Seed Upper Renamed'
    next.description = 'Revision two workout description.'
    const result = initializeDatabaseSeeds(db, { exercises: BUILTIN_EXERCISES, programs })
    const updated = service.getProgram(program.id)
    assert.equal(result.programs.updated, 1)
    assert.equal(updated.name, 'My Upper Workout')
    assert.equal(updated.description, 'Revision two workout description.')
    assert.equal(updated.seedRevision, 2)
  } finally { cleanupDatabase(db, directory) }
})

test('seed keys are database-unique', () => {
  const { db, directory } = createTestDatabase({ seed: true })
  try {
    const rows = db.prepare('SELECT id, seed_key FROM exercises ORDER BY id LIMIT 2').all()
    assert.throws(() => db.prepare('UPDATE exercises SET seed_key = ? WHERE id = ?').run(rows[0].seed_key, rows[1].id), /UNIQUE constraint failed/)
    const programs = db.prepare('SELECT id, seed_key FROM programs ORDER BY id LIMIT 2').all()
    assert.throws(() => db.prepare('UPDATE programs SET seed_key = ? WHERE id = ?').run(programs[0].seed_key, programs[1].id), /UNIQUE constraint failed/)
  } finally { cleanupDatabase(db, directory) }
})

test('deleting seeded records creates tombstones and prevents reinstallation', () => {
  const { db, directory } = createTestDatabase({ seed: true })
  try {
    const exercises = createExerciseService(db)
    const programs = createProgramService(db)
    const exercise = exercises.getExerciseBySlug('pushups')
    const program = programs.listPrograms().find(item => item.slug === 'upper')
    assert.equal(exercises.deleteExercise(exercise.id), true)
    assert.equal(programs.deleteProgram(program.id), true)
    const result = initializeDatabaseSeeds(db)
    assert.deepEqual(counts(db), { exercises: 55, programs: 6 })
    assert.equal(result.exercises.tombstoned, 1)
    assert.equal(result.programs.tombstoned, 1)
    assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM seed_tombstones').get().count), 2)
  } finally { cleanupDatabase(db, directory) }
})

test('seeded library remains compatible with Quick Workout, Recovery, and Statistics', () => {
  const { db, directory } = createTestDatabase({ seed: true })
  try {
    createProfileService(db).updateProfile({ equipment: ['bodyweight'] })
    const quick = createQuickWorkoutService(db).generate({ durationMinutes: 30 })
    assert.ok(quick.exercises.length > 0)
    const exercise = createExerciseService(db).getExerciseBySlug('pushups')
    const sessions = createSessionService(db)
    const session = sessions.startSession({ name: 'Seed verification' })
    sessions.logSet(session.id, { exerciseId: exercise.id, setNumber: 1, reps: 8, weight: 50, done: true })
    sessions.finishSession(session.id)
    const recovery = createRecoveryService(db, { now: () => new Date('2026-10-05T12:00:00.000Z') }).getRecovery()
    assert.equal(recovery.muscles.some(item => item.muscle === 'chest'), true)
    const statistics = createStatisticsService(db, { now: () => new Date('2026-10-05T12:00:00.000Z') }).getOverview()
    assert.equal(statistics.volumeByExercise.some(item => item.exerciseSlug === 'pushups'), true)
  } finally { cleanupDatabase(db, directory) }
})
