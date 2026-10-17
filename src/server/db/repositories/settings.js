function serializeValue(value) {
  return JSON.stringify(value)
}

function deserializeValue(row) {
  if (!row) {
    return null
  }

  try {
    return JSON.parse(row.value)
  } catch {
    return row.value
  }
}

export function createSettingsRepository(db) {
  function get(key) {
    const row = db
      .prepare(`
        SELECT value
        FROM settings
        WHERE key = ?
      `)
      .get(key)

    return deserializeValue(row)
  }

  function set(key, value) {
    db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value
    `).run(key, serializeValue(value))

    return get(key)
  }

  function remove(key) {
    const result = db
      .prepare(`
        DELETE FROM settings
        WHERE key = ?
      `)
      .run(key)

    return result.changes > 0
  }

  function getMany(keys) {
    const values = {}

    for (const key of keys) {
      values[key] = get(key)
    }

    return values
  }

  function getAll() {
    const rows = db
      .prepare(`
        SELECT key, value
        FROM settings
        ORDER BY key ASC
      `)
      .all()

    const values = {}

    for (const row of rows) {
      values[row.key] = deserializeValue(row)
    }

    return values
  }

  return {
    get,
    set,
    remove,
    getMany,
    getAll
  }
}
