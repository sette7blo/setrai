import { INITIAL_SCHEMA } from './schema.js'
import { retainLocalColumns } from './local-schema.js'
import secondaryMuscleCorrections from '../../shared/exercise-secondary-muscles.json' with { type: 'json' }
import exerciseSeeds from './seed/exercise-seeds.json' with { type: 'json' }
import programSeeds from './seed/program-seeds.json' with { type: 'json' }

const LEGACY_EXERCISE_JSON_FIELDS = new Set(['muscles', 'equipment', 'tags', 'instructions'])
const LEGACY_EXERCISE_FIELDS = [
  'name', 'description', 'category', 'muscle_group', 'muscles', 'equipment',
  'difficulty', 'movement_type', 'tags', 'instructions', 'image_url',
  'default_sets', 'default_reps', 'default_rest',
  'source_type', 'status'
]

function adoptLocalSeeds(db) {
  const exerciseUpdate = db.prepare(`
    UPDATE exercises SET seed_key = ?, seed_revision = ?, seed_baseline = ?,
      name = ?, description = ?, category = ?, muscle_group = ?, muscles = ?,
      equipment = ?, difficulty = ?, movement_type = ?, tags = ?, instructions = ?,
      image_url = ?, default_sets = ?, default_reps = ?,
      default_rest = ?, source_type = ?, status = ? WHERE id = ?
  `)
  for (const seed of exerciseSeeds) {
    const row = db.prepare('SELECT * FROM exercises WHERE slug = ?').get(seed.slug)
    if (!row || row.seed_key) continue
    const oldBaseline = row.catalog_baseline ? JSON.parse(row.catalog_baseline) : null
    const baseline = Object.fromEntries(LEGACY_EXERCISE_FIELDS.map(field => [field, seed[field]]))
    const values = LEGACY_EXERCISE_FIELDS.map(field => {
      const current = LEGACY_EXERCISE_JSON_FIELDS.has(field) ? JSON.parse(row[field] || '[]') : row[field]
      const next = oldBaseline && field in oldBaseline && JSON.stringify(current) === JSON.stringify(oldBaseline[field])
        ? seed[field] : current
      return LEGACY_EXERCISE_JSON_FIELDS.has(field) ? JSON.stringify(next) : next
    })
    exerciseUpdate.run(seed.seedKey, seed.revision, JSON.stringify(baseline), ...values, row.id)
  }
  const programUpdate = db.prepare('UPDATE programs SET seed_key = ?, seed_revision = ?, seed_baseline = ? WHERE slug = ? AND seed_key IS NULL')
  for (const seed of programSeeds) {
    const baseline = { name: seed.name, description: seed.description, difficulty: seed.difficulty,
      tags: seed.tags, plan: { blocks: seed.blocks, exercises: seed.exercises } }
    programUpdate.run(seed.seedKey, seed.revision, JSON.stringify(baseline), seed.slug)
  }
}

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
  },
  {
    version: 7,
    name: 'versioned-local-seeds',
    up(db) {
      db.exec(`
        ALTER TABLE exercises ADD COLUMN seed_key TEXT;
        ALTER TABLE exercises ADD COLUMN seed_revision INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE exercises ADD COLUMN seed_baseline TEXT;
        ALTER TABLE programs ADD COLUMN seed_key TEXT;
        ALTER TABLE programs ADD COLUMN seed_revision INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE programs ADD COLUMN seed_baseline TEXT;

        CREATE UNIQUE INDEX idx_exercises_seed_key
          ON exercises(seed_key)
          WHERE seed_key IS NOT NULL;
        CREATE UNIQUE INDEX idx_programs_seed_key
          ON programs(seed_key)
          WHERE seed_key IS NOT NULL;

        CREATE TABLE seed_tombstones (
          entity_type TEXT NOT NULL,
          seed_key TEXT NOT NULL,
          deleted_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (entity_type, seed_key),
          CHECK (entity_type IN ('exercise', 'program'))
        );
      `)
    }
  },
  {
    version: 8,
    name: 'remove-remote-catalog-provenance',
    up(db) {
      adoptLocalSeeds(db)
      retainLocalColumns(db)
    }
  },
  {
    version: 9,
    name: 'local-training-schema',
    up(db) { retainLocalColumns(db) }
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
