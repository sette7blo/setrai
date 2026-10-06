// src/server/db/repositories/sessions.js

function mapSessionRow(row, sets = []) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    programId: row.program_id,
    programName: row.program_name ?? '',
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    notes: row.notes,
    sets,
    summaryEventId: row.summary_event_id ?? null,
    summaryImageUrl: row.summary_image_url ?? null
  }
}

function mapSetRow(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    exerciseSlug: row.exercise_slug,
    exerciseName: row.exercise_name,
    setNumber: row.set_number,
    reps: row.reps,
    weight: row.weight,
    done: Boolean(row.done),
    loggedAt: row.logged_at
  }
}

function readSets(db, sessionId) {
  return db
    .prepare(`
      SELECT *
      FROM session_sets
      WHERE session_id = ?
      ORDER BY logged_at ASC, id ASC
    `)
    .all(sessionId)
    .map(mapSetRow)
}

function getSessionRow(db, id) {
  return db
    .prepare(`
      SELECT *
      FROM sessions
      WHERE id = ?
    `)
    .get(id)
}

function mapSession(db, row) {
  return mapSessionRow(
    row,
    row ? readSets(db, row.id) : []
  )
}

export function createSessionRepository(db) {
  function create(input) {
    const result = db
      .prepare(`
        INSERT INTO sessions (
          program_id,
          program_name,
          notes
        )
        VALUES (?, ?, ?)
      `)
      .run(
        input.programId ?? null,
        input.programName ?? input.name ?? '',
        input.notes ?? ''
      )

    return getById(Number(result.lastInsertRowid))
  }

  function getById(id) {
    return mapSession(db, getSessionRow(db, id))
  }

  function list({ limit = 50 } = {}) {
    return db
      .prepare(`
        SELECT *
        FROM sessions
        ORDER BY started_at DESC, id DESC
        LIMIT ?
      `)
      .all(limit)
      .map((row) => mapSessionRow(row))
  }

  function finish(id, input = {}) {
    const result = db
      .prepare(`
        UPDATE sessions
        SET
          finished_at = COALESCE(?, datetime('now')),
          notes = COALESCE(?, notes)
        WHERE id = ?
      `)
      .run(
        input.finishedAt ?? null,
        input.notes ?? null,
        id
      )

    return result.changes === 0 ? null : getById(id)
  }

  function insertSet(sessionId, input) {
    const result = db
      .prepare(`
        INSERT INTO session_sets (
          session_id,
          exercise_id,
          exercise_slug,
          exercise_name,
          set_number,
          reps,
          weight,
          done
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        sessionId,
        input.exerciseId,
        input.exerciseSlug,
        input.exerciseName,
        input.setNumber,
        input.reps,
        input.weight,
        input.done ? 1 : 0
      )

    return getSet(
      sessionId,
      Number(result.lastInsertRowid)
    )
  }

  function getSet(sessionId, setId) {
    return mapSetRow(
      db
        .prepare(`
          SELECT *
          FROM session_sets
          WHERE id = ? AND session_id = ?
        `)
        .get(setId, sessionId)
    )
  }

  function updateSet(sessionId, setId, input) {
    const updates = []
    const parameters = []

    const fields = {
      setNumber: 'set_number',
      reps: 'reps',
      weight: 'weight',
      done: 'done'
    }

    for (const [inputKey, column] of Object.entries(fields)) {
      if (!(inputKey in input)) {
        continue
      }

      updates.push(`${column} = ?`)
      parameters.push(
        inputKey === 'done'
          ? input[inputKey] ? 1 : 0
          : input[inputKey]
      )
    }

    if (updates.length === 0) {
      return getSet(sessionId, setId)
    }

    parameters.push(setId, sessionId)

    const result = db
      .prepare(`
        UPDATE session_sets
        SET ${updates.join(', ')}
        WHERE id = ? AND session_id = ?
      `)
      .run(...parameters)

    return result.changes === 0
      ? null
      : getSet(sessionId, setId)
  }

  function deleteSet(sessionId, setId) {
    const result = db
      .prepare(`
        DELETE FROM session_sets
        WHERE id = ? AND session_id = ?
      `)
      .run(setId, sessionId)

    return result.changes > 0
  }

  function listSets(sessionId) {
    return readSets(db, sessionId)
  }

  return {
    create,
    getById,
    list,
    finish,
    insertSet,
    getSet,
    updateSet,
    deleteSet,
    listSets
  }
}
