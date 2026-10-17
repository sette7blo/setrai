import exerciseSeeds from './exercise-seeds.json' with { type: 'json' }
import programSeeds from './program-seeds.json' with { type: 'json' }
import { createExerciseRepository } from '../repositories/exercises/index.js'
import { createProgramRepository } from '../repositories/programs/index.js'

const EXERCISE_FIELDS = [
  'name', 'description', 'category', 'muscle_group', 'muscles', 'equipment',
  'difficulty', 'movement_type', 'tags', 'instructions', 'image_url',
  'default_sets', 'default_reps', 'default_rest',
  'source_type', 'status'
]
const PROGRAM_FIELDS = ['name', 'description', 'difficulty', 'tags']
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const exerciseBaseline = seed => Object.fromEntries(EXERCISE_FIELDS.map(field => [field, seed[field]]))
const programBaseline = seed => ({
  ...Object.fromEntries(PROGRAM_FIELDS.map(field => [field, seed[field]])),
  plan: { blocks: seed.blocks, exercises: seed.exercises }
})

function tombstoned(db, entityType, seedKey) {
  return Boolean(db.prepare(`
    SELECT 1 FROM seed_tombstones
    WHERE entity_type = ? AND seed_key = ?
  `).get(entityType, seedKey))
}

function validateSeeds(exercises = exerciseSeeds, programs = programSeeds) {
  const exerciseKeys = new Set()
  const exerciseSlugs = new Set()
  for (const seed of exercises) {
    if (!seed.seedKey || !Number.isInteger(seed.revision) || seed.revision < 1 || !seed.slug || !seed.name) {
      throw new Error('Invalid exercise seed metadata')
    }
    if (exerciseKeys.has(seed.seedKey) || exerciseSlugs.has(seed.slug)) throw new Error(`Duplicate exercise seed: ${seed.seedKey}`)
    exerciseKeys.add(seed.seedKey)
    exerciseSlugs.add(seed.slug)
  }
  const programKeys = new Set()
  const programSlugs = new Set()
  for (const seed of programs) {
    if (!seed.seedKey || !Number.isInteger(seed.revision) || seed.revision < 1 || !seed.slug || !seed.name) {
      throw new Error('Invalid program seed metadata')
    }
    if (programKeys.has(seed.seedKey) || programSlugs.has(seed.slug)) throw new Error(`Duplicate program seed: ${seed.seedKey}`)
    programKeys.add(seed.seedKey)
    programSlugs.add(seed.slug)
    for (const entry of seed.exercises) {
      if (!exerciseKeys.has(entry.exerciseSeedKey)) throw new Error(`Unknown exercise seed: ${entry.exerciseSeedKey}`)
    }
  }
}

function reconcileExercises(db, seeds = exerciseSeeds) {
  const repository = createExerciseRepository(db)
  const result = { checked: seeds.length, inserted: 0, adopted: 0, updated: 0, unchanged: 0, tombstoned: 0 }
  for (const seed of seeds) {
    const rows = repository.list({ status: null })
    let existing = rows.find(row => row.seed_key === seed.seedKey)
    if (!existing) existing = rows.find(row => !row.seed_key && row.slug === seed.slug)
    if (!existing && tombstoned(db, 'exercise', seed.seedKey)) { result.tombstoned++; continue }
    const baseline = exerciseBaseline(seed)
    if (!existing) {
      repository.create({ ...seed, seed_key: seed.seedKey, seed_revision: seed.revision,
        seed_baseline: JSON.stringify(baseline) })
      result.inserted++
      continue
    }
    if (!existing.seed_key) {
      const patch = { seed_key: seed.seedKey, seed_revision: seed.revision,
        seed_baseline: JSON.stringify(baseline) }
      repository.update(existing.id, patch)
      result.adopted++
      continue
    }
    if (existing.seed_revision >= seed.revision) { result.unchanged++; continue }
    const previous = existing.seed_baseline ? JSON.parse(existing.seed_baseline) : null
    const patch = { seed_revision: seed.revision, seed_baseline: JSON.stringify(baseline) }
    if (previous) {
      for (const field of EXERCISE_FIELDS) {
        if (same(existing[field], previous[field])) patch[field] = baseline[field]
      }
    }
    repository.update(existing.id, patch)
    result.updated++
  }
  return result
}

function exerciseBySeedKey(exercises, seedKey) {
  const exercise = exercises.find(item => item.seed_key === seedKey)
  if (!exercise) throw new Error(`Missing local exercise for ${seedKey}`)
  return exercise
}

function resolvedProgramPlan(seed, exercises) {
  return {
    blocks: seed.blocks,
    exercises: seed.exercises.map(entry => {
      const exercise = exerciseBySeedKey(exercises, entry.exerciseSeedKey)
      return { ...entry, exerciseId: exercise.id, exerciseSlug: exercise.slug }
    })
  }
}

function currentProgramPlan(program, exercises) {
  return {
    blocks: program.blocks,
    exercises: program.exercises.map(entry => {
      const exercise = exercises.find(item => item.id === entry.exerciseId)
      return {
        exerciseSeedKey: exercise?.seed_key ?? null,
        position: entry.position,
        sets: entry.sets,
        reps: entry.reps,
        restSeconds: entry.restSeconds,
        targetWeight: entry.targetWeight,
        notes: entry.notes
      }
    })
  }
}

function reconcilePrograms(db, seeds = programSeeds) {
  const repository = createProgramRepository(db)
  const exercises = createExerciseRepository(db).list({ status: null })
  const result = { checked: seeds.length, inserted: 0, adopted: 0, updated: 0, unchanged: 0, tombstoned: 0 }
  for (const seed of seeds) {
    const rows = repository.list()
    let existing = rows.find(row => row.seedKey === seed.seedKey)
    if (!existing) existing = rows.find(row => !row.seedKey && row.slug === seed.slug)
    if (!existing && tombstoned(db, 'program', seed.seedKey)) { result.tombstoned++; continue }
    const baseline = programBaseline(seed)
    if (!existing) {
      const plan = resolvedProgramPlan(seed, exercises)
      repository.create({ ...seed, ...plan, seedKey: seed.seedKey, seedRevision: seed.revision,
        seedBaseline: baseline })
      result.inserted++
      continue
    }
    if (!existing.seedKey) {
      repository.update(existing.id, { seedKey: seed.seedKey, seedRevision: seed.revision,
        seedBaseline: baseline })
      result.adopted++
      continue
    }
    if (existing.seedRevision >= seed.revision) { result.unchanged++; continue }
    const previous = existing.seedBaseline
    const patch = { seedRevision: seed.revision, seedBaseline: baseline }
    if (previous) {
      for (const field of PROGRAM_FIELDS) {
        if (same(existing[field], previous[field])) patch[field] = baseline[field]
      }
      if (same(currentProgramPlan(existing, exercises), previous.plan)) {
        const plan = resolvedProgramPlan(seed, exercises)
        patch.blocks = plan.blocks
        patch.exercises = plan.exercises
      }
    }
    repository.update(existing.id, patch)
    result.updated++
  }
  return result
}

function transaction(db, operation) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = operation()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function validateBuiltinExercises(exercises = exerciseSeeds) {
  validateSeeds(exercises, programSeeds)
  return true
}

export function seedBuiltinExercises(db, seeds = exerciseSeeds) {
  validateSeeds(seeds, programSeeds)
  return transaction(db, () => reconcileExercises(db, seeds))
}

export function initializeDatabaseSeeds(db, seeds = {}) {
  const exercises = seeds.exercises ?? exerciseSeeds
  const programs = seeds.programs ?? programSeeds
  validateSeeds(exercises, programs)
  return transaction(db, () => ({
    exercises: reconcileExercises(db, exercises),
    programs: reconcilePrograms(db, programs)
  }))
}

export { exerciseSeeds as BUILTIN_EXERCISES, programSeeds as BUILTIN_PROGRAMS }
