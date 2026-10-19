import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

import { openDatabase } from '../db/connection.js'

const SQLITE_HEADER = Buffer.from('SQLite format 3\0')
const REQUIRED_TABLES = new Set([
  'schema_migrations', 'settings', 'exercises', 'programs',
  'program_exercises', 'sessions', 'session_sets', 'body_log'
])

function clientError(message) {
  return Object.assign(new Error(message), { statusCode: 400 })
}

function quoteLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function tableNames(db, schema = 'main') {
  return db.prepare(`
    SELECT name FROM ${schema}.sqlite_schema
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all().map(row => row.name)
}

function assertSetraiDatabase(db) {
  const integrity = db.prepare('PRAGMA quick_check').all()
  if (integrity.length !== 1 || integrity[0].quick_check !== 'ok') {
    throw clientError('The selected database failed SQLite integrity checks.')
  }
  const tables = new Set(tableNames(db))
  if ([...REQUIRED_TABLES].some(name => !tables.has(name))) {
    throw clientError('The selected file is not a Setrai database backup.')
  }
}

function vacuumInto(db, target) {
  fs.rmSync(target, { force: true })
  db.exec(`VACUUM INTO ${quoteLiteral(target)}`)
  fs.chmodSync(target, 0o600)
}

function copyDatabase(db, sourcePath) {
  db.prepare('ATTACH DATABASE ? AS restore').run(sourcePath)
  db.exec('PRAGMA foreign_keys = OFF')
  try {
    const tables = tableNames(db)
    const restoredTables = new Set(tableNames(db, 'restore'))
    if (tables.some(name => !restoredTables.has(name))) {
      throw clientError('The backup schema is not compatible with this Setrai version.')
    }
    db.exec('BEGIN IMMEDIATE')
    try {
      for (const name of [...tables].reverse()) {
        const table = quoteIdentifier(name)
        db.exec(`DELETE FROM main.${table}`)
      }
      for (const name of tables) {
        const table = quoteIdentifier(name)
        db.exec(`INSERT INTO main.${table} SELECT * FROM restore.${table}`)
      }
      const hasSequence = db.prepare("SELECT 1 FROM main.sqlite_schema WHERE type = 'table' AND name = 'sqlite_sequence'").get()
        && db.prepare("SELECT 1 FROM restore.sqlite_schema WHERE type = 'table' AND name = 'sqlite_sequence'").get()
      if (hasSequence) {
        db.exec('DELETE FROM main.sqlite_sequence; INSERT INTO main.sqlite_sequence SELECT * FROM restore.sqlite_sequence')
      }
      const problems = db.prepare('PRAGMA foreign_key_check').all()
      if (problems.length) throw clientError('The backup contains invalid data relationships.')
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON')
    db.exec('DETACH DATABASE restore')
  }
}

export function createBackupService(db, { dataDir }) {
  const backupDir = path.join(dataDir, 'backups')
  fs.mkdirSync(backupDir, { recursive: true })

  function exportDatabase() {
    const target = path.join(backupDir, `.export-${randomUUID()}.db`)
    try {
      vacuumInto(db, target)
      return fs.readFileSync(target)
    } finally {
      fs.rmSync(target, { force: true })
    }
  }

  function restoreDatabase(buffer) {
    if (!Buffer.isBuffer(buffer) || !buffer.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)) {
      throw clientError('Select a valid SQLite database backup.')
    }
    const incoming = path.join(backupDir, `.restore-${randomUUID()}.db`)
    fs.writeFileSync(incoming, buffer, { mode: 0o600 })
    let candidate
    try {
      candidate = new DatabaseSync(incoming, { readOnly: true })
      assertSetraiDatabase(candidate)
      const currentVersion = Number(db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()?.version || 0)
      const backupVersion = Number(candidate.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()?.version || 0)
      if (backupVersion > currentVersion) throw clientError('This backup was created by a newer Setrai version.')
      candidate.close()
      candidate = null

      const upgraded = openDatabase(incoming, { seed: true })
      assertSetraiDatabase(upgraded)
      upgraded.close()

      const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('-', '').replace(/\.\d{3}Z$/, 'Z')
      const safetyName = `setrai-before-restore-${stamp}.db`
      vacuumInto(db, path.join(backupDir, safetyName))
      copyDatabase(db, incoming)
      return { safetyBackup: safetyName }
    } finally {
      candidate?.close()
      fs.rmSync(incoming, { force: true })
      fs.rmSync(`${incoming}-wal`, { force: true })
      fs.rmSync(`${incoming}-shm`, { force: true })
    }
  }

  return { exportDatabase, restoreDatabase }
}