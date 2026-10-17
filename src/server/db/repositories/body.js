function mapBodyEntry(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    date: row.date,
    weightKg: row.weight_kg,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createBodyRepository(db) {
  function list({ from = null, to = null } = {}) {
    const conditions = []
    const parameters = []

    if (from) {
      conditions.push('date >= ?')
      parameters.push(from)
    }

    if (to) {
      conditions.push('date <= ?')
      parameters.push(to)
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    return db
      .prepare(`
        SELECT *
        FROM body_log
        ${where}
        ORDER BY date DESC, id DESC
      `)
      .all(...parameters)
      .map(mapBodyEntry)
  }

  function getById(id) {
    return mapBodyEntry(
      db
        .prepare(`
          SELECT *
          FROM body_log
          WHERE id = ?
        `)
        .get(id)
    )
  }

  function getByDate(date) {
    return mapBodyEntry(
      db
        .prepare(`
          SELECT *
          FROM body_log
          WHERE date = ?
        `)
        .get(date)
    )
  }

  function getLatest() {
    return mapBodyEntry(
      db
        .prepare(`
          SELECT *
          FROM body_log
          ORDER BY date DESC, id DESC
          LIMIT 1
        `)
        .get()
    )
  }

  function create(input) {
    const result = db
      .prepare(`
        INSERT INTO body_log (
          date,
          weight_kg,
          notes
        )
        VALUES (?, ?, ?)
      `)
      .run(
        input.date,
        input.weightKg,
        input.notes ?? ''
      )

    return getById(Number(result.lastInsertRowid))
  }

  function update(id, input) {
    const updates = []
    const parameters = []

    if ('date' in input) {
      updates.push('date = ?')
      parameters.push(input.date)
    }

    if ('weightKg' in input) {
      updates.push('weight_kg = ?')
      parameters.push(input.weightKg)
    }

    if ('notes' in input) {
      updates.push('notes = ?')
      parameters.push(input.notes ?? '')
    }

    if (updates.length === 0) {
      return getById(id)
    }

    updates.push(`updated_at = datetime('now')`)
    parameters.push(id)

    const result = db
      .prepare(`
        UPDATE body_log
        SET ${updates.join(', ')}
        WHERE id = ?
      `)
      .run(...parameters)

    return result.changes === 0 ? null : getById(id)
  }

  function upsertByDate(input) {
    const existing = getByDate(input.date)

    if (existing) {
      return update(existing.id, input)
    }

    return create(input)
  }

  function remove(id) {
    const result = db
      .prepare(`
        DELETE FROM body_log
        WHERE id = ?
      `)
      .run(id)

    return result.changes > 0
  }

  return {
    list,
    getById,
    getByDate,
    getLatest,
    create,
    update,
    upsertByDate,
    remove
  }
}
