import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import {
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
  assert.equal(body.muscle_group, 'legs')
  assert.deepEqual(body.muscles, ['quads', 'glutes'])
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
