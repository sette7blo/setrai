import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createBackupService } from '../src/server/backup/service.js'
import { openDatabase } from '../src/server/db/connection.js'

function fixture() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-backup-test-'))
  const db = openDatabase(path.join(dataDir, 'setrai.db'), { seed: true })
  return { dataDir, db, service: createBackupService(db, { dataDir }) }
}

function close(f) {
  f.db.close()
  fs.rmSync(f.dataDir, { recursive: true, force: true })
}

function setValue(db, key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

test('exports a consistent Setrai database with uploaded media', () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'Backup Person')
    const mediaPath = path.join(f.dataDir, 'media', 'exercises', 'custom.webp')
    fs.mkdirSync(path.dirname(mediaPath), { recursive: true })
    fs.writeFileSync(mediaPath, Buffer.from([1, 2, 3, 4]))
    const buffer = f.service.exportBackup()
    const archive = JSON.parse(gunzipSync(buffer).toString('utf8'))
    assert.equal(archive.format, 'setrai-backup')
    assert.deepEqual(archive.media, [{ path: 'exercises/custom.webp', data: 'AQIDBA==' }])
    const database = Buffer.from(archive.database, 'base64')
    assert.equal(database.subarray(0, 16).toString(), 'SQLite format 3\0')
    const exported = path.join(f.dataDir, 'exported.db')
    fs.writeFileSync(exported, database)
    const snapshot = new DatabaseSync(exported, { readOnly: true })
    assert.equal(snapshot.prepare("SELECT value FROM settings WHERE key = 'display_name'").get().value, 'Backup Person')
    assert.equal(snapshot.prepare('PRAGMA quick_check').get().quick_check, 'ok')
    snapshot.close()
  } finally {
    close(f)
  }
})

test('restores database and media while creating a full safety backup', () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'Before export')
    const mediaPath = path.join(f.dataDir, 'media', 'exercises', 'custom.webp')
    fs.mkdirSync(path.dirname(mediaPath), { recursive: true })
    fs.writeFileSync(mediaPath, 'original image')
    const buffer = f.service.exportBackup()
    setValue(f.db, 'display_name', 'After export')
    f.db.prepare("DELETE FROM exercises WHERE seed_key = 'setrai.exercise.air-bike'").run()
    fs.writeFileSync(mediaPath, 'changed image')
    fs.writeFileSync(path.join(path.dirname(mediaPath), 'extra.webp'), 'remove me')

    const result = f.service.restoreBackup(buffer)
    assert.equal(f.db.prepare("SELECT value FROM settings WHERE key = 'display_name'").get().value, 'Before export')
    assert.ok(f.db.prepare("SELECT id FROM exercises WHERE seed_key = 'setrai.exercise.air-bike'").get())
    assert.equal(fs.readFileSync(mediaPath, 'utf8'), 'original image')
    assert.equal(fs.existsSync(path.join(path.dirname(mediaPath), 'extra.webp')), false)
    assert.equal(result.mediaFiles, 1)
    assert.match(result.safetyBackup, /^setrai-before-restore-.*\.setrai$/)
    assert.ok(fs.existsSync(path.join(f.dataDir, 'backups', result.safetyBackup)))
    assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length, 0)
  } finally {
    close(f)
  }
})

test('rejects invalid and non-Setrai database files without changing data', () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'Unchanged')
    assert.throws(() => f.service.restoreBackup(Buffer.from('not sqlite')), /valid Setrai backup archive/)
    const unrelatedPath = path.join(f.dataDir, 'unrelated.db')
    const unrelated = new DatabaseSync(unrelatedPath)
    unrelated.exec('CREATE TABLE unrelated (id INTEGER)')
    unrelated.close()
    assert.throws(() => f.service.restoreBackup(fs.readFileSync(unrelatedPath)), /not a Setrai database/)
    assert.equal(f.db.prepare("SELECT value FROM settings WHERE key = 'display_name'").get().value, 'Unchanged')
  } finally {
    close(f)
  }
})

test('rejects archive path traversal before changing media', () => {
  const f = fixture()
  try {
    const mediaPath = path.join(f.dataDir, 'media', 'exercises', 'keep.webp')
    fs.mkdirSync(path.dirname(mediaPath), { recursive: true })
    fs.writeFileSync(mediaPath, 'keep')
    const archive = JSON.parse(gunzipSync(f.service.exportBackup()).toString('utf8'))
    archive.media = [{ path: '../escape.webp', data: 'YmFk' }]
    const malicious = gzipSync(Buffer.from(JSON.stringify(archive)))
    assert.throws(() => f.service.restoreBackup(malicious), /invalid media path/)
    assert.equal(fs.readFileSync(mediaPath, 'utf8'), 'keep')
    assert.equal(fs.existsSync(path.join(f.dataDir, 'escape.webp')), false)
  } finally {
    close(f)
  }
})
