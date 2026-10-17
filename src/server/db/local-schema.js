import { DatabaseSync } from 'node:sqlite'
import { INITIAL_SCHEMA } from './schema.js'

const LOCAL_ADDITIONS = {
  exercises: ['movement_type', 'seed_key', 'seed_revision', 'seed_baseline'],
  programs: ['seed_key', 'seed_revision', 'seed_baseline'],
  sessions: ['plan_json', 'runtime_json']
}

// Derive the supported columns from the canonical schema instead of keeping
// obsolete integration field names in the application. Called only by migrations.
export function retainLocalColumns(db) {
  const reference = new DatabaseSync(':memory:')
  try {
    reference.exec(INITIAL_SCHEMA)
    for (const [table, additions] of Object.entries(LOCAL_ADDITIONS)) {
      const allowed = new Set([
        ...reference.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name),
        ...additions
      ])
      for (const { name } of db.prepare(`PRAGMA table_info(${table})`).all()) {
        if (!allowed.has(name)) {
          const quoted = `"${name.replaceAll('"', '""')}"`
          db.exec(`ALTER TABLE ${table} DROP COLUMN ${quoted}`)
        }
      }
    }
  } finally {
    reference.close()
  }
}
