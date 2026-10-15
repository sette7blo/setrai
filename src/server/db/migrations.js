// src/server/db/migrations.js

import { INITIAL_SCHEMA } from './schema.js'
import secondaryMuscleCorrections from '../../shared/exercise-secondary-muscles.json' with { type: 'json' }

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial-setrai-schema',

    up(db) {
      db.exec(INITIAL_SCHEMA)
    }
  },
  {
    version: 2,
    name: 'live-session-plan-and-clock',
    up(db) {
      db.exec(`
        ALTER TABLE sessions ADD COLUMN plan_json TEXT;
        ALTER TABLE sessions ADD COLUMN runtime_json TEXT NOT NULL DEFAULT '{}';
        ALTER TABLE session_sets ADD COLUMN context_json TEXT NOT NULL DEFAULT '{}';
      `)
    }
  },
  {
    version: 3,
    name: 'exercise-catalog-baseline',
    up(db) {
      db.exec('ALTER TABLE exercises ADD COLUMN catalog_baseline TEXT')
    }
  },
  {
    version: 4,
    name: 'program-catalog-baseline',
    up(db) { db.exec('ALTER TABLE programs ADD COLUMN catalog_baseline TEXT') }
  },
  {
    version: 5,
    name: 'exercise-movement-type',
    up(db) {
      db.exec(`
        ALTER TABLE exercises ADD COLUMN movement_type TEXT NOT NULL DEFAULT '';
        UPDATE exercises
        SET movement_type = CASE
          WHEN EXISTS (SELECT 1 FROM json_each(exercises.tags) WHERE lower(value) = 'compound') THEN 'compound'
          WHEN EXISTS (SELECT 1 FROM json_each(exercises.tags) WHERE lower(value) = 'isolation') THEN 'isolation'
          ELSE ''
        END;
      `)
    }
  },
  {
    version: 6,
    name: 'repair-imported-exercise-secondary-muscles',
    up(db) {
      const update = db.prepare(`
        UPDATE exercises
        SET muscles = ?
        WHERE slug = ?
          AND json_array_length(muscles) = 1
          AND lower(json_extract(muscles, '$[0]')) = lower(muscle_group)
      `)

      for (const [slug, muscles] of Object.entries(secondaryMuscleCorrections)) {
        update.run(JSON.stringify(muscles), slug)
      }
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
