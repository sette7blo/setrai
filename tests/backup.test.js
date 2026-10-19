import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'

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

test('exports a consistent Setrai SQLite database', () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'Backup Person')
    const buffer = f.service.exportDatabase()
    assert.equal(buffer.subarray(0, 16).toString(), 'SQLite format 3\0')
    const exported = path.join(f.dataDir, 'exported.db')
    fs.writeFileSync(exported, buffer)
    const snapshot = new DatabaseSync(exported, { readOnly: true })
    assert.equal(snapshot.prepare("SELECT value FROM settings WHERE key = 'display_name'").get().value, 'Backup Person')
    assert.equal(snapshot.prepare('PRAGMA quick_check').get().quick_check, 'ok')
    snapshot.close()
  } finally {
    close(f)
  }
})

test('restores all database data and creates a safety backup', () => {
  const f = fixture()
  try {
    setValue(f.db, 'display_name', 'Before export')
    const buffer = f.service.exportDatabase()
    setValue(f.db, 'display_name', 'After export')
    f.db.prepare("DELETE FROM exercises WHERE seed_key = 'setrai.exercise.air-bike'").run()

    const result = f.service.restoreDatabase(buffer)
    assert.equal(f.db.prepare("SELECT value FROM settings WHERE key = 'display_name'").get().value, 'Before export')
    assert.ok(f.db.prepare("SELECT id FROM exercises WHERE seed_key = 'setrai.exercise.air-bike'").get())
    assert.match(result.safetyBackup, /^setrai-before-restore-.*\.db$/)
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
    assert.throws(() => f.service.restoreDatabase(Buffer.from('not sqlite')), /valid SQLite/)
    const unrelatedPath = path.join(f.dataDir, 'unrelated.db')
    const unrelated = new DatabaseSync(unrelatedPath)
    unrelated.exec('CREATE TABLE unrelated (id INTEGER)')
    unrelated.close()
    assert.throws(() => f.service.restoreDatabase(fs.readFileSync(unrelatedPath)), /not a Setrai database/)
    assert.equal(f.db.prepare("SELECT value FROM settings WHERE key = 'display_name'").get().value, 'Unchanged')
  } finally {
    close(f)
  }
})
