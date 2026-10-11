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
    db.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')))")
    db.prepare('INSERT INTO schema_migrations(version,name) VALUES(1,?)').run('initial-setrai-schema')
    db.prepare('INSERT INTO sessions(program_name,notes) VALUES(?,?)').run('Existing workout', 'Existing note')
    db.prepare('INSERT INTO session_sets(session_id,exercise_slug,exercise_name,set_number,reps,weight,done) VALUES(1,?,?,?,?,?,1)').run('press', 'Press', 1, 8, 25)
    runMigrations(db)
    runMigrations(db)
    const session = createSessionRepository(db).getById(1)
    assert.equal(session.programName, 'Existing workout')
    assert.equal(session.notes, 'Existing note')
    assert.equal(session.sets[0].reps, 8)
    assert.equal(session.sets[0].weight, 25)
    assert.equal(session.plan, null)
    assert.deepEqual(session.runtime, {})
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 4)
  } finally { db.close() }
})
