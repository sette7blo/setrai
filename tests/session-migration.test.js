import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { INITIAL_SCHEMA } from '../src/server/db/schema.js'
import { runMigrations } from '../src/server/db/migrations.js'
import { createSessionRepository } from '../src/server/db/repositories/sessions.js'

test('upgrades an existing version-one session database without changing logged history', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(INITIAL_SCHEMA)
    for (const table of ['exercises', 'programs', 'sessions']) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN external_metadata TEXT`)
    }
    db.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')))")
    db.prepare('INSERT INTO schema_migrations(version,name) VALUES(1,?)').run('initial-setrai-schema')
    db.prepare('INSERT INTO sessions(program_name,notes) VALUES(?,?)').run('Existing workout', 'Existing note')
    db.prepare('INSERT INTO session_sets(session_id,exercise_slug,exercise_name,set_number,reps,weight,done) VALUES(1,?,?,?,?,?,1)').run('press', 'Press', 1, 8, 25)
    db.prepare('INSERT INTO exercises(slug,name,tags) VALUES(?,?,?)').run('press', 'Press', '["compound","push"]')
    db.prepare('INSERT INTO exercises(slug,name,tags) VALUES(?,?,?)').run('curl', 'Curl', '["isolation"]')
    db.prepare('INSERT INTO exercises(slug,name,tags) VALUES(?,?,?)').run('carry', 'Carry', '["grip"]')
    db.prepare('INSERT INTO exercises(slug,name,muscle_group,muscles,tags) VALUES(?,?,?,?,?)')
      .run('pushups', 'Pushups', 'chest', '["chest"]', '["compound"]')
    runMigrations(db)
    runMigrations(db)
    for (const table of ['exercises', 'programs', 'sessions']) {
      assert.equal(db.prepare(`PRAGMA table_info(${table})`).all()
        .some(column => column.name === 'external_metadata'), false)
    }
    const session = createSessionRepository(db).getById(1)
    assert.equal(session.programName, 'Existing workout')
    assert.equal(session.notes, 'Existing note')
    assert.equal(session.sets[0].reps, 8)
    assert.equal(session.sets[0].weight, 25)
    assert.equal(session.plan, null)
    assert.deepEqual(session.runtime, {})
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 9)
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'seed_tombstones'").get().count, 1)
    assert.deepEqual(
      db.prepare('SELECT slug, movement_type FROM exercises ORDER BY slug').all()
        .map(row => ({ ...row })),
      [
        { slug: 'carry', movement_type: '' },
        { slug: 'curl', movement_type: 'isolation' },
        { slug: 'press', movement_type: 'compound' },
        { slug: 'pushups', movement_type: 'compound' }
      ]
    )
    assert.deepEqual(JSON.parse(db.prepare('SELECT muscles FROM exercises WHERE slug = ?').get('pushups').muscles), [
      'shoulders',
      'triceps'
    ])
  } finally { db.close() }
})

test('version-eight databases lose obsolete metadata while retaining local IDs and history', () => {
  const db = new DatabaseSync(':memory:')
  try {
    runMigrations(db)
    db.exec('DELETE FROM schema_migrations WHERE version = 9')
    for (const table of ['exercises', 'programs', 'sessions']) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN external_metadata TEXT`)
    }
    db.exec(`
      INSERT INTO exercises (id, slug, name, external_metadata) VALUES (5, 'press', 'My press', 'old');
      INSERT INTO programs (id, slug, name, external_metadata) VALUES (7, 'local', 'My program', 'old');
      INSERT INTO program_exercises (program_id, exercise_id, exercise_slug) VALUES (7, 5, 'press');
      INSERT INTO sessions (id, program_id, program_name, external_metadata) VALUES (9, 7, 'My program', 'old');
      INSERT INTO session_sets (session_id, exercise_id, exercise_slug, set_number, reps, weight)
        VALUES (9, 5, 'press', 1, 8, 25);
    `)
    runMigrations(db)
    runMigrations(db)
    assert.equal(db.prepare('SELECT name FROM exercises WHERE id = 5').get().name, 'My press')
    assert.equal(db.prepare('SELECT name FROM programs WHERE id = 7').get().name, 'My program')
    assert.equal(db.prepare('SELECT exercise_id FROM program_exercises').get().exercise_id, 5)
    const session = createSessionRepository(db).getById(9)
    assert.equal(session.programId, 7)
    assert.equal(session.sets[0].reps, 8)
    assert.equal(session.sets[0].weight, 25)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
    for (const table of ['exercises', 'programs', 'sessions']) {
      assert.equal(db.prepare(`PRAGMA table_info(${table})`).all()
        .some(column => column.name === 'external_metadata'), false)
    }
  } finally { db.close() }
})
