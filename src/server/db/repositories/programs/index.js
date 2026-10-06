// src/server/db/repositories/programs/index.js

import {
  mapProgramRow,
  normalizeProgramInput
} from './mapper.js'
import {
  readProgramExercises,
  replaceProgramExercises
} from './exercises.js'
import {
  createUniqueProgramSlug
} from './slug.js'

function getProgramRow(db, field, value) {
  return db
    .prepare(`
      SELECT *
      FROM programs
      WHERE ${field} = ?
    `)
    .get(value)
}

function mapProgram(db, row) {
  return mapProgramRow(
    row,
    row ? readProgramExercises(db, row.id) : []
  )
}

function insertProgram(db, values, slug) {
  return db
    .prepare(`
      INSERT INTO programs (
        slug,
        name,
        description,
        difficulty,
        tags,
        blocks,
        is_temporary,
        nostr_event_id,
        nostr_pubkey,
        nostr_address,
        nostr_published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      slug,
      values.name,
      values.description,
      values.difficulty,
      values.tags,
      values.blocks,
      values.is_temporary,
      values.nostr_event_id,
      values.nostr_pubkey,
      values.nostr_address,
      values.nostr_published_at
    )
}

export function createProgramRepository(db) {
  function list() {
    return db
      .prepare(`
        SELECT *
        FROM programs
        ORDER BY name COLLATE NOCASE ASC
      `)
      .all()
      .map((row) => mapProgram(db, row))
  }

  function getById(id) {
    return mapProgram(db, getProgramRow(db, 'id', id))
  }

  function getBySlug(slug) {
    return mapProgram(db, getProgramRow(db, 'slug', slug))
  }

  function create(input) {
    const values = normalizeProgramInput(input)

    if (!values.name) {
      throw new Error('Program name is required')
    }

    const slug = createUniqueProgramSlug(
      db,
      values.name,
      values.slug
    )

    const result = insertProgram(db, values, slug)
    const programId = Number(result.lastInsertRowid)

    replaceExercises(programId, input.exercises ?? [])

    return getById(programId)
  }

  function update(id, input) {
    const existing = getById(id)

    if (!existing) {
      return null
    }

    const values = normalizeProgramInput({
      ...existing,
      ...input
    })
    const slug = input.slug
      ? createUniqueProgramSlug(db, values.name, input.slug, id)
      : existing.slug

    db.prepare(`
      UPDATE programs
      SET
        slug = ?,
        name = ?,
        description = ?,
        difficulty = ?,
        tags = ?,
        blocks = ?,
        is_temporary = ?,
        nostr_event_id = ?,
        nostr_pubkey = ?,
        nostr_address = ?,
        nostr_published_at = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      slug,
      values.name,
      values.description,
      values.difficulty,
      values.tags,
      values.blocks,
      values.is_temporary,
      values.nostr_event_id,
      values.nostr_pubkey,
      values.nostr_address,
      values.nostr_published_at,
      id
    )

    if (Array.isArray(input.exercises)) {
      replaceExercises(id, input.exercises)
    }

    return getById(id)
  }

  function remove(id) {
    const result = db
      .prepare(`DELETE FROM programs WHERE id = ?`)
      .run(id)

    return result.changes > 0
  }

  function duplicate(id) {
    const program = getById(id)

    if (!program) {
      return null
    }

    return create({
      ...program,
      name: `${program.name} Copy`,
      slug: `${program.slug}-copy`,
      nostrEventId: null,
      nostrPubkey: null,
      nostrAddress: null,
      nostrPublishedAt: null,
      exercises: program.exercises
    })
  }

  function getExercises(programId) {
    return readProgramExercises(db, programId)
  }

  function replaceExercises(programId, exercises) {
    return replaceProgramExercises(
      db,
      programId,
      exercises
    )
  }

  function count() {
    return Number(
      db
        .prepare(`
          SELECT COUNT(*) AS count
          FROM programs
        `)
        .get()
        .count
    )
  }

  return {
    list,
    getById,
    getBySlug,
    create,
    update,
    remove,
    duplicate,
    getExercises,
    replaceExercises,
    count
  }
}
