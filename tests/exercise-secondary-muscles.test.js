import assert from 'node:assert/strict'
import test from 'node:test'
import taxonomy from '../src/shared/exercise-taxonomy.json' with { type: 'json' }
import corrections from '../src/shared/exercise-secondary-muscles.json' with { type: 'json' }
import { catalogSecondaryMuscles } from '../src/server/exercises/secondary-muscles.js'

test('secondary-muscle correction catalog is complete and taxonomy-safe', () => {
  const allowed = new Set(taxonomy.secondaryMuscles.map(option => option.value))
  assert.equal(Object.keys(corrections).length, 56)

  for (const [slug, muscles] of Object.entries(corrections)) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    assert.equal(new Set(muscles).size, muscles.length)
    for (const muscle of muscles) assert.ok(allowed.has(muscle), `${slug}: ${muscle}`)
  }
})

test('known catalog rows replace duplicated primaries but preserve real event secondaries', () => {
  assert.deepEqual(
    catalogSecondaryMuscles('alternate-hammer-curl', 'biceps', ['biceps']),
    ['forearms']
  )
  assert.deepEqual(
    catalogSecondaryMuscles('pushups', 'chest', ['chest', 'triceps']),
    ['triceps']
  )
  assert.deepEqual(catalogSecondaryMuscles('unknown', 'chest', ['chest']), [])
})
