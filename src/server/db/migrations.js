// src/server/db/migrations.js

import { INITIAL_SCHEMA } from './schema.js'

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial-setrai-schema',

    up(db) {
      db.exec(INITIAL_SCHEMA)
    }
  }
]

function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

function getAppliedVersions(db) {
  const rows = db
    .prepare(`
      SELECT version
      FROM schema_migrations
      ORDER BY version
    `)
    .all()

  return new Set(
    rows.map((row) => Number(row.version))
  )
}

function applyMigration(db, migration) {
  console.log(
    `Applying database migration ${migration.version}: ${migration.name}`
  )

  db.exec('BEGIN IMMEDIATE')

  try {
    migration.up(db)

    db.prepare(`
      INSERT INTO schema_migrations (
        version,
        name
      )
      VALUES (?, ?)
    `).run(
      migration.version,
      migration.name
    )

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function runMigrations(db) {
  ensureMigrationTable(db)

  const appliedVersions = getAppliedVersions(db)

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      continue
    }

    applyMigration(db, migration)
  }
}

