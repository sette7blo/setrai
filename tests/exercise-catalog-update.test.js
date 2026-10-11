import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { createDiscoveryService } from '../src/server/nostr/discovery-service.js'
import { exerciseFromEvent } from '../src/server/nostr/exercise-event.js'

const event = JSON.parse(fs.readFileSync(new URL('./fixtures/workstr-exercise.json', import.meta.url)))

test('reviewed catalog updates persist remote changes and keep edited fields and favorites', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-catalog-update-'))
  let db = openDatabase(path.join(directory, 'test.db'))
  try {
    let service = createExerciseService(db)
    const source = exerciseFromEvent(event)
    const saved = service.importDiscoveredExercise(source).exercise
    service.updateExercise(saved.id, { name: 'My custom name', default_sets: 5, favourite: true })
    const discovery = createDiscoveryService({ relays: ['fake'] }, service, async () => [event])
    assert.equal((await discovery.listExercises()).exercises[0].updateAvailable, false)
    const newer = { ...source, name: 'Remote new name', instructions: ['New instructions'], default_sets: 8, nostr_event_id: 'b'.repeat(64) }
    assert.equal(service.importDiscoveredExercise(newer).exercise.nostr_event_id, source.nostr_event_id)
    const updated = service.updateDiscoveredExercise(newer).exercise
    assert.equal(updated.id, saved.id)
    assert.equal(updated.name, 'My custom name')
    assert.equal(updated.default_sets, 5)
    assert.equal(updated.favourite, true)
    assert.deepEqual(updated.instructions, ['New instructions'])
    assert.equal(updated.nostr_event_id, newer.nostr_event_id)
    assert.equal((await discovery.listExercises()).exercises[0].updateAvailable, true)
    db.close()
    db = openDatabase(path.join(directory, 'test.db'))
    service = createExerciseService(db)
    assert.ok(service.getExercise(saved.id).catalog_baseline)
    assert.equal(service.getExercise(saved.id).favourite, true)
    const next = service.updateDiscoveredExercise({ ...newer, instructions: ['Next instructions'], nostr_event_id: 'c'.repeat(64) }).exercise
    assert.deepEqual(next.instructions, ['Next instructions'])
    assert.equal(next.name, 'My custom name')
  } finally { db.close(); fs.rmSync(directory, { recursive: true, force: true }) }
})

test('legacy imports without a baseline retain their local data when accepting a new version', () => {
  const db = openDatabase(':memory:')
  try {
    const service = createExerciseService(db)
    const source = exerciseFromEvent(event)
    const saved = service.createExercise({ ...source, name: 'Legacy local edit', favourite: true })
    const updated = service.updateDiscoveredExercise({ ...source, name: 'Remote replacement', nostr_event_id: 'b'.repeat(64) }).exercise
    assert.equal(updated.id, saved.id)
    assert.equal(updated.name, 'Legacy local edit')
    assert.equal(updated.favourite, true)
    assert.ok(updated.catalog_baseline)
  } finally { db.close() }
})

test('explicit image replacement updates a legacy import without overwriting other local fields', () => {
  const db = openDatabase(':memory:')
  try {
    const service = createExerciseService(db)
    const source = exerciseFromEvent(event)
    const saved = service.createExercise({ ...source, name: 'My name', favourite: true })
    const newer = { ...source, image_url: 'https://example.com/new.jpg', nostr_event_id: 'b'.repeat(64) }
    const updated = service.updateDiscoveredExercise(newer, { replaceImage: true }).exercise
    assert.equal(updated.image_url, newer.image_url)
    assert.equal(updated.name, 'My name')
    assert.equal(updated.favourite, true)
    assert.equal(updated.nostr_event_id, newer.nostr_event_id)
    // Also repair an image after that version was accepted without replacing it.
    service.updateExercise(saved.id, { image_url: source.image_url })
    assert.equal(service.updateDiscoveredExercise(newer, { replaceImage: true }).exercise.image_url, newer.image_url)
  } finally { db.close() }
})
