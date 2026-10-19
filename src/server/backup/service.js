import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { gunzipSync, gzipSync } from 'node:zlib'

import { openDatabase } from '../db/connection.js'

const SQLITE_HEADER = Buffer.from('SQLite format 3\0')
const ARCHIVE_FORMAT = 'setrai-backup'
const MAX_UNPACKED_BYTES = 768 * 1024 * 1024
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

function backupStamp() {
  return new Date().toISOString().replaceAll(':', '').replaceAll('-', '').replace('.', '')
}

function listMedia(mediaDir) {
  if (!fs.existsSync(mediaDir)) return []
  const files = []
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.isFile()) {
        const relative = path.relative(mediaDir, absolute).split(path.sep).join('/')
        files.push({ path: relative, data: fs.readFileSync(absolute).toString('base64') })
      }
    }
  }
  visit(mediaDir)
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

function safeMediaPath(relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\')) {
    throw clientError('The backup contains an invalid media path.')
  }
  const normalized = path.posix.normalize(relative)
  if (normalized !== relative || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw clientError('The backup contains an invalid media path.')
  }
  return normalized
}

function decodeArchive(buffer) {
  try {
    const unpacked = gunzipSync(buffer, { maxOutputLength: MAX_UNPACKED_BYTES })
    const archive = JSON.parse(unpacked.toString('utf8'))
    if (archive?.format !== ARCHIVE_FORMAT || archive?.version !== 1 || typeof archive.database !== 'string') {
      throw new Error('invalid manifest')
    }
    if (!Array.isArray(archive.media) || archive.media.length > 10000) throw new Error('invalid media')
    const database = Buffer.from(archive.database, 'base64')
    if (!database.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)) throw new Error('invalid database')
    const media = archive.media.map(entry => {
      if (!entry || typeof entry.data !== 'string') throw new Error('invalid media')
      return { path: safeMediaPath(entry.path), data: Buffer.from(entry.data, 'base64') }
    })
    return { database, media }
  } catch (error) {
    if (error?.statusCode) throw error
    throw clientError('Select a valid Setrai backup archive or legacy database backup.')
  }
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
        db.exec(`DELETE FROM main.${quoteIdentifier(name)}`)
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
      if (db.prepare('PRAGMA foreign_key_check').all().length) {
        throw clientError('The backup contains invalid data relationships.')
      }
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
  const mediaDir = path.join(dataDir, 'media')
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
      copyDatabase(db, incoming)
    } finally {
      candidate?.close()
      fs.rmSync(incoming, { force: true })
      fs.rmSync(`${incoming}-wal`, { force: true })
      fs.rmSync(`${incoming}-shm`, { force: true })
    }
  }

  function exportBackup() {
    const archive = {
      format: ARCHIVE_FORMAT,
      version: 1,
      createdAt: new Date().toISOString(),
      database: exportDatabase().toString('base64'),
      media: listMedia(mediaDir)
    }
    return gzipSync(Buffer.from(JSON.stringify(archive)), { level: 6 })
  }

  function restoreBackup(buffer) {
    const isLegacyDatabase = buffer.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)
    const incoming = isLegacyDatabase ? { database: buffer, media: null } : decodeArchive(buffer)
    const safetyName = `setrai-before-restore-${backupStamp()}-${randomUUID().slice(0, 8)}.setrai`
    fs.writeFileSync(path.join(backupDir, safetyName), exportBackup(), { mode: 0o600 })

    let stage = null
    let previous = null
    try {
      if (incoming.media) {
        stage = path.join(backupDir, `.media-restore-${randomUUID()}`)
        previous = path.join(backupDir, `.media-previous-${randomUUID()}`)
        fs.mkdirSync(stage, { recursive: true })
        for (const entry of incoming.media) {
          const target = path.join(stage, ...entry.path.split('/'))
          fs.mkdirSync(path.dirname(target), { recursive: true })
          fs.writeFileSync(target, entry.data, { mode: 0o600 })
        }
        if (fs.existsSync(mediaDir)) fs.renameSync(mediaDir, previous)
        fs.renameSync(stage, mediaDir)
        stage = null
      }

      restoreDatabase(incoming.database)
      if (previous && fs.existsSync(previous)) fs.rmSync(previous, { recursive: true, force: true })
      return { safetyBackup: safetyName, mediaFiles: incoming.media?.length ?? null }
    } catch (error) {
      if (incoming.media) {
        fs.rmSync(mediaDir, { recursive: true, force: true })
        if (previous && fs.existsSync(previous)) fs.renameSync(previous, mediaDir)
      }
      throw error
    } finally {
      if (stage) fs.rmSync(stage, { recursive: true, force: true })
    }
  }

  return { exportBackup, restoreBackup }
}
