const COLUMNS = 'id, name, prefix, scope, created_at, last_used_at'

export function createApiKeyRepository(db) {
  function list() {
    return db.prepare(`SELECT ${COLUMNS} FROM api_keys ORDER BY created_at DESC, id DESC`).all()
  }

  function insert({ name, prefix, keyHash, scope }) {
    const result = db.prepare(`
      INSERT INTO api_keys (name, prefix, key_hash, scope)
      VALUES (?, ?, ?, ?)
    `).run(name, prefix, keyHash, scope)
    return db.prepare(`SELECT ${COLUMNS} FROM api_keys WHERE id = ?`).get(Number(result.lastInsertRowid))
  }

  function findByHash(keyHash) {
    return db.prepare(`SELECT ${COLUMNS} FROM api_keys WHERE key_hash = ?`).get(keyHash) ?? null
  }

  // Throttled so a plugin polling every few seconds does not write on every request.
  function touch(id) {
    db.prepare(`
      UPDATE api_keys SET last_used_at = datetime('now')
      WHERE id = ? AND (last_used_at IS NULL OR last_used_at < datetime('now', '-60 seconds'))
    `).run(id)
  }

  function remove(id) {
    return db.prepare('DELETE FROM api_keys WHERE id = ?').run(id).changes > 0
  }

  return { list, insert, findByHash, touch, remove }
}
