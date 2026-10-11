import assert from 'node:assert/strict'
import test from 'node:test'
import { openDatabase } from '../src/server/db/connection.js'
import { createProgramService } from '../src/server/programs/service.js'
import { createExerciseService } from '../src/server/exercises/service.js'

function source(overrides = {}) {
  return { name: 'Upper', slug: 'upper', description: 'Original', difficulty: 'beginner', tags: ['strength'], blocks: [],
    address: `33402:${'a'.repeat(64)}:workstr:beastmode:program:upper`, eventId: '1'.repeat(64), pubkey: 'a'.repeat(64), createdAt: 1700000000,
    exercises: [{ address: 'workstr:exercise:curl', name: 'Curl', muscleGroup: 'biceps', imageUrl: '', sets: 3, reps: '8', restSec: 60, weight: null, notes: '' }], ...overrides }
}
test('reviewed updates preserve local edits, update untouched fields and plan, and keep workout identity', () => {
  const db = openDatabase(':memory:')
  try {
    const programs = createProgramService(db)
    const imported = programs.importDiscoveredProgram(source(), []).program
    programs.updateProgram(imported.id, { name: 'My upper workout' })
    const next = source({ eventId: '2'.repeat(64), createdAt: 1700000100, name: 'New upper', description: 'Updated instructions',
      exercises: [{ ...source().exercises[0], sets: 4 }] })
    const review = programs.reviewDiscoveredProgram(next)
    assert.equal(review.fields.find(field => field.field === 'name').apply, false)
    assert.equal(review.fields.find(field => field.field === 'plan').apply, true)
    assert.equal(programs.getProgram(imported.id).nostrEventId, '1'.repeat(64))
    const updated = programs.updateDiscoveredProgram(next, []).program
    assert.equal(updated.id, imported.id)
    assert.equal(updated.name, 'My upper workout')
    assert.equal(updated.description, 'Updated instructions')
    assert.equal(updated.exercises[0].sets, 4)
    assert.equal(updated.nostrEventId, next.eventId)
    assert.equal(programs.getProgramCount(), 1)
    programs.updateProgram(imported.id, { exercises: [{ ...updated.exercises[0], sets: 5 }] })
    const third = source({ eventId: '3'.repeat(64), createdAt: 1700000200, exercises: [source().exercises[0], { ...source().exercises[0], address: 'workstr:exercise:new', name: 'New' }] })
    const count = createExerciseService(db).getExerciseCount()
    const kept = programs.updateDiscoveredProgram(third, []).program
    assert.equal(kept.exercises[0].sets, 5)
    assert.equal(kept.exercises.length, 1)
    assert.equal(createExerciseService(db).getExerciseCount(), count)
    assert.equal(programs.duplicateProgram(imported.id).catalogBaseline, null)
  } finally { db.close() }
})
test('legacy imports keep all saved content and update failures roll back newly imported exercises', () => {
  const db = openDatabase(':memory:')
  try {
    const programs = createProgramService(db)
    const imported = programs.importDiscoveredProgram(source(), []).program
    db.prepare('UPDATE programs SET catalog_baseline = NULL WHERE id = ?').run(imported.id)
    const next = source({ eventId: '2'.repeat(64), createdAt: 1700000100, name: 'New title', exercises: [] })
    assert.equal(programs.reviewDiscoveredProgram(next).legacy, true)
    const kept = programs.updateDiscoveredProgram(next, []).program
    assert.equal(kept.name, 'Upper')
    assert.equal(kept.exercises.length, 1)
    assert.equal(kept.nostrEventId, next.eventId)
    const other = programs.importDiscoveredProgram(source({ address: source().address + '-other', slug: 'other' }), []).program
    const broken = source({ address: other.nostrAddress, eventId: '3'.repeat(64), exercises: [
      { ...source().exercises[0], address: 'workstr:exercise:new', name: 'New' }, { ...source().exercises[0], address: null }
    ] })
    const count = createExerciseService(db).getExerciseCount()
    assert.throws(() => programs.updateDiscoveredProgram(broken, []))
    assert.equal(createExerciseService(db).getExerciseCount(), count)
    assert.equal(programs.getProgram(other.id).nostrEventId, other.nostrEventId)
  } finally { db.close() }
})
