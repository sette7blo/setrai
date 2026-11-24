import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { exerciseMediaRoot, ORPHAN_GRACE_MS, sweepOrphanedExerciseImages } from '../src/server/exercises/media.js'

function fixture(run) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-media-sweep-'))
  const root = exerciseMediaRoot(dataDir)
  fs.mkdirSync(root, { recursive: true })
  try {
    run({ dataDir, root })
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
}

function file(root, name, ageMs) {
  const target = path.join(root, name)
  fs.writeFileSync(target, 'image')
  const time = new Date(Date.now() - ageMs)
  fs.utimesSync(target, time, time)
  return target
}

test('removes only old, unreferenced uploads', () => {
  fixture(({ dataDir, root }) => {
    const old = ORPHAN_GRACE_MS + 60_000
    const used = file(root, 'mabc12-0123456789ab.webp', old)
    const orphan = file(root, 'mabc12-ba9876543210.png', old)
    const fresh = file(root, 'mabc13-aaaaaaaaaaaa.jpg', 60_000)
    const foreign = file(root, 'my-photo.jpg', old)
    fs.mkdirSync(path.join(root, 'nested'))
    const nested = file(path.join(root, 'nested'), 'mabc12-cccccccccccc.png', old)
    const outside = path.join(dataDir, 'outside-dddddddddddd.png')
    fs.writeFileSync(outside, 'keep')
    fs.symlinkSync(outside, path.join(root, 'mabc12-eeeeeeeeeeee.png'))

    const removed = sweepOrphanedExerciseImages(dataDir, ['/media/exercises/mabc12-0123456789ab.webp?v=2'])

    assert.deepEqual(removed, ['mabc12-ba9876543210.png'])
    assert.equal(fs.existsSync(used), true)
    assert.equal(fs.existsSync(orphan), false)
    assert.equal(fs.existsSync(fresh), true)
    assert.equal(fs.existsSync(foreign), true)
    assert.equal(fs.existsSync(nested), true)
    assert.equal(fs.readFileSync(outside, 'utf8'), 'keep')
    assert.equal(fs.lstatSync(path.join(root, 'mabc12-eeeeeeeeeeee.png')).isSymbolicLink(), true)
  })
})

test('a missing media folder is not an error', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-media-sweep-'))
  try {
    assert.deepEqual(sweepOrphanedExerciseImages(dataDir, []), [])
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
