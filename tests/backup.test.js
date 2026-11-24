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

test('exports a consistent Setrai database with uploaded media', async () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'Backup Person')
    const mediaPath = path.join(f.dataDir, 'media', 'exercises', 'custom.webp')
    fs.mkdirSync(path.dirname(mediaPath), { recursive: true })
    fs.writeFileSync(mediaPath, Buffer.from([1, 2, 3, 4]))
    const buffer = await f.service.exportBackup()
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

test('restores database and media while creating a full safety backup', async () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'Before export')
    const mediaPath = path.join(f.dataDir, 'media', 'exercises', 'custom.webp')
    fs.mkdirSync(path.dirname(mediaPath), { recursive: true })
    fs.writeFileSync(mediaPath, 'original image')
    const buffer = await f.service.exportBackup()
    setValue(f.db, 'display_name', 'After export')
    f.db.prepare("DELETE FROM exercises WHERE seed_key = 'setrai.exercise.air-bike'").run()
    fs.writeFileSync(mediaPath, 'changed image')
    fs.writeFileSync(path.join(path.dirname(mediaPath), 'extra.webp'), 'remove me')

    const result = await f.service.restoreBackup(buffer)
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

test('rejects invalid and non-Setrai database files without changing data', async () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'Unchanged')
    await assert.rejects(f.service.restoreBackup(Buffer.from('not sqlite')), /valid Setrai backup archive/)
    const unrelatedPath = path.join(f.dataDir, 'unrelated.db')
    const unrelated = new DatabaseSync(unrelatedPath)
    unrelated.exec('CREATE TABLE unrelated (id INTEGER)')
    unrelated.close()
    await assert.rejects(f.service.restoreBackup(fs.readFileSync(unrelatedPath)), /not a Setrai database/)
    assert.equal(f.db.prepare("SELECT value FROM settings WHERE key = 'display_name'").get().value, 'Unchanged')
  } finally {
    close(f)
  }
})

test('rejects archive path traversal before changing media', async () => {
  const f = fixture()
  try {
    const mediaPath = path.join(f.dataDir, 'media', 'exercises', 'keep.webp')
    fs.mkdirSync(path.dirname(mediaPath), { recursive: true })
    fs.writeFileSync(mediaPath, 'keep')
    const archive = JSON.parse(gunzipSync(await f.service.exportBackup()).toString('utf8'))
    archive.media = [{ path: '../escape.webp', data: 'YmFk' }]
    const malicious = gzipSync(Buffer.from(JSON.stringify(archive)))
    await assert.rejects(f.service.restoreBackup(malicious), /invalid media path/)
    assert.equal(fs.readFileSync(mediaPath, 'utf8'), 'keep')
    assert.equal(fs.existsSync(path.join(f.dataDir, 'escape.webp')), false)
  } finally {
    close(f)
  }
})

// The archive exactly as the version 1 writer built it: one JSON.stringify.
function legacyArchive(databaseFile, media) {
  return gzipSync(Buffer.from(JSON.stringify({
    format: 'setrai-backup',
    version: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    database: fs.readFileSync(databaseFile).toString('base64'),
    media
  })), { level: 6 })
}

function snapshot(f, name) {
  const file = path.join(f.dataDir, name)
  f.db.exec(`VACUUM INTO '${file}'`)
  return file
}

test('streamed export is byte-compatible with the version 1 archive', async () => {
  const f = fixture()
  try {
    const big = Buffer.alloc(3 * 64 * 1024 * 2 + 7, 7)
    fs.mkdirSync(path.join(f.dataDir, 'media', 'exercises'), { recursive: true })
    fs.writeFileSync(path.join(f.dataDir, 'media', 'exercises', 'b.webp'), big)
    fs.writeFileSync(path.join(f.dataDir, 'media', 'exercises', 'a.webp'), 'a')
    const archive = JSON.parse(gunzipSync(await f.service.exportBackup()).toString('utf8'))
    assert.deepEqual(Object.keys(archive), ['format', 'version', 'createdAt', 'database', 'media'])
    assert.deepEqual(archive.media.map(entry => entry.path), ['exercises/a.webp', 'exercises/b.webp'])
    assert.ok(Buffer.from(archive.media[1].data, 'base64').equals(big))
    assert.equal(archive.media[1].data, big.toString('base64'))
  } finally {
    close(f)
  }
})

test('restores a version 1 archive written by the earlier exporter', async () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'From v1')
    const archive = legacyArchive(snapshot(f, 'v1.db'), [{ path: 'exercises/old.webp', data: Buffer.from('old').toString('base64') }])
    setValue(f.db, 'display_name', 'Changed')
    const result = await f.service.restoreBackup(archive)
    assert.equal(result.mediaFiles, 1)
    assert.equal(f.db.prepare("SELECT value FROM settings WHERE key = 'display_name'").get().value, 'From v1')
    assert.equal(fs.readFileSync(path.join(f.dataDir, 'media', 'exercises', 'old.webp'), 'utf8'), 'old')
  } finally {
    close(f)
  }
})

test('restore copies by column name when the backup orders columns differently', async () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'Ordered')
    const file = snapshot(f, 'reordered.db')
    const other = new DatabaseSync(file)
    other.exec(`
      CREATE TABLE settings_reordered (value TEXT, key TEXT PRIMARY KEY);
      INSERT INTO settings_reordered (value, key) SELECT value, key FROM settings;
      DROP TABLE settings;
      ALTER TABLE settings_reordered RENAME TO settings;
    `)
    other.close()
    setValue(f.db, 'display_name', 'Changed')
    await f.service.restoreBackup(legacyArchive(file, []))
    assert.equal(f.db.prepare("SELECT value FROM settings WHERE key = 'display_name'").get().value, 'Ordered')
    assert.equal(f.db.prepare("SELECT key FROM settings WHERE value = 'Ordered'").get().key, 'display_name')
  } finally {
    close(f)
  }
})

test('keeps only the newest five safety backups', async () => {
  const f = fixture()
  try {
    const backups = path.join(f.dataDir, 'backups')
    for (let index = 0; index < 6; index += 1) {
      fs.writeFileSync(path.join(backups, `setrai-before-restore-20260101T00000${index}000Z-0000000${index}.setrai`), 'old')
    }
    fs.writeFileSync(path.join(backups, 'my-own-export.setrai'), 'keep')
    const result = await f.service.restoreBackup(await f.service.exportBackup())
    const remaining = fs.readdirSync(backups).filter(name => name.startsWith('setrai-before-restore-')).sort()
    assert.equal(remaining.length, 5)
    assert.ok(remaining.includes(result.safetyBackup))
    assert.equal(remaining.includes('setrai-before-restore-20260101T000000000Z-00000000.setrai'), false)
    assert.equal(fs.readFileSync(path.join(backups, 'my-own-export.setrai'), 'utf8'), 'keep')
  } finally {
    close(f)
  }
})
