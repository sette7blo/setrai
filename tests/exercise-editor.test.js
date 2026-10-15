import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import {
  MAX_BYTES,
  parseImageMultipart,
  storeExerciseImage,
  resolveExerciseMediaFile
} from '../src/server/exercises/media.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { normalizeExerciseWrite } from '../src/server/exercises/write.js'

function createTestDatabase() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-ex-edit-'))
  const db = openDatabase(path.join(directory, 'test.db'))
  return { db, directory }
}

test('normalizeExerciseWrite maps camelCase create payload', () => {
  const body = normalizeExerciseWrite({
    name: '  Goblet Squat ',
    muscleGroup: 'legs',
    muscles: ['quads', 'glutes'],
    defaultSets: 4,
    defaultReps: '10',
    defaultRest: 75,
    imageUrl: '/media/exercises/demo.png'
  })
  assert.equal(body.name, 'Goblet Squat')
  assert.equal(body.muscle_group, 'quadriceps')
  assert.deepEqual(body.muscles, ['quadriceps', 'glutes'])
  assert.equal(body.default_sets, 4)
  assert.equal(body.image_url, '/media/exercises/demo.png')
  assert.equal(body.source_type, 'manual')
})

test('normalizeExerciseWrite rejects unsafe image urls', () => {
  assert.throws(
    () => normalizeExerciseWrite({ name: 'X', imageUrl: 'javascript:alert(1)' }, { partial: true }),
    /imageUrl/
  )
})

test('normalizeExerciseWrite canonicalizes supported taxonomy aliases', () => {
  const body = normalizeExerciseWrite({
    name: 'Incline press',
    category: 'strength',
    muscleGroup: 'pecs',
    muscles: ['front delts', 'triceps'],
    equipment: ['dumbbell', 'bench'],
    difficulty: 'intermediate',
    movementType: 'compound'
  })
  assert.equal(body.muscle_group, 'chest')
  assert.deepEqual(body.muscles, ['anterior-deltoid', 'triceps'])
  assert.deepEqual(body.equipment, ['dumbbells', 'bench'])
  assert.equal(body.movement_type, 'compound')
})

test('normalizeExerciseWrite rejects unknown structural taxonomy values', () => {
  assert.throws(
    () => normalizeExerciseWrite({ name: 'X', muscleGroup: 'quadreceps' }),
    /muscleGroup must use a supported value/
  )
  assert.throws(
    () => normalizeExerciseWrite({ name: 'X', equipment: ['dumbell'] }),
    /equipment must use a supported value/
  )
  assert.throws(
    () => normalizeExerciseWrite({ name: 'X', category: 'power-ish' }),
    /category must use a supported value/
  )
  assert.throws(
    () => normalizeExerciseWrite({ name: 'X', movementType: 'hybrid' }),
    /movementType must use a supported value/
  )
  assert.throws(
    () => normalizeExerciseWrite({ name: 'X' }, { requireMovementType: true }),
    /movementType is required/
  )
})

test('stores and resolves uploaded exercise images under data dir', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-media-'))
  try {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    const saved = storeExerciseImage(directory, png, 'image/png')
    assert.match(saved.imageUrl, /^\/media\/exercises\//)
    const name = saved.imageUrl.split('/').pop()
    const filePath = resolveExerciseMediaFile(directory, name)
    assert.ok(filePath)
    assert.equal(fs.readFileSync(filePath).equals(png), true)
    assert.equal(resolveExerciseMediaFile(directory, '../secret.png'), null)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('accepts normal phone-sized photos and rejects files over 10 MB', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-media-size-'))
  try {
    const photo = Buffer.alloc(3 * 1024 * 1024)
    Buffer.from([0xff, 0xd8, 0xff]).copy(photo)
    const saved = storeExerciseImage(directory, photo, 'image/jpeg')
    assert.equal(saved.bytes, photo.length)
    assert.throws(
      () => storeExerciseImage(directory, Buffer.alloc(MAX_BYTES + 1), 'image/jpeg'),
      /10 MB or smaller/
    )
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('multipart parser extracts image field', () => {
  const boundary = '----setraiBoundary'
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="image"; filename="x.png"\r\n' +
      'Content-Type: image/png\r\n\r\n'
    ),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ])
  const part = parseImageMultipart(body, `multipart/form-data; boundary=${boundary}`)
  assert.equal(part.fileName, 'x.png')
  assert.equal(part.buffer.equals(png), true)
})

test('create/update via service with write normalization and favourite patch', () => {
  const { db, directory } = createTestDatabase()
  try {
    const service = createExerciseService(db)
    const created = service.createExercise({
      name: 'Cable Fly',
      muscleGroup: 'chest',
      muscles: ['chest'],
      defaultSets: 3,
      imageUrl: '/media/exercises/demo.png'
    })
    assert.equal(created.muscle_group, 'chest')
    assert.equal(created.image_url, '/media/exercises/demo.png')
    const updated = service.updateExercise(created.id, {
      description: 'Pec isolation',
      favourite: true
    })
    assert.equal(updated.description, 'Pec isolation')
    assert.equal(updated.favourite, true)
    assert.equal(updated.muscle_group, 'chest')
  } finally {
    db.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
