import {
  mapExercise,
  movementTypeFromTags,
  normalizeExerciseInput
} from './mapper.js'
import {
  createUniqueExerciseSlug
} from './slug.js'

const ALLOWED_UPDATE_FIELDS = [

  'name',
  'description',
  'category',
  'muscle_group',
  'muscles',
  'equipment',
  'difficulty',
  'movement_type',
  'tags',
  'instructions',
  'image_url',
  'favourite',
  'default_sets',
  'default_reps',
  'default_rest',
  'source_type',
  'status',
  'seed_key',
  'seed_revision',
  'seed_baseline'
]

function buildListQuery({ search, favourite, status }) {
  const conditions = []
  const parameters = []

  if (status !== null) {
    conditions.push('status = ?')
    parameters.push(status)
  }

  if (favourite !== null) {
    conditions.push('favourite = ?')
    parameters.push(favourite ? 1 : 0)
  }

  if (search.trim()) {
    conditions.push(`(
      name LIKE ?
      OR description LIKE ?
      OR category LIKE ?
      OR muscle_group LIKE ?
    )`)

    const query = `%${search.trim()}%`
    parameters.push(query, query, query, query)
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : ''

  return { where, parameters }
}

export function createExerciseRepository(db) {
  function list({
    search = '',
    favourite = null,
    status = 'active'
  } = {}) {
    const { where, parameters } = buildListQuery({
      search,
      favourite,
      status
    })

    return db
      .prepare(`
        SELECT *
        FROM exercises
        ${where}
        ORDER BY name COLLATE NOCASE ASC
      `)
      .all(...parameters)
      .map(mapExercise)
  }

  function getById(id) {
    return mapExercise(
      db
        .prepare(`
          SELECT *
          FROM exercises
          WHERE id = ?
        `)
        .get(id)
    )
  }

  function getBySlug(slug) {
    return mapExercise(
      db
        .prepare(`
          SELECT *
          FROM exercises
          WHERE slug = ?
        `)
        .get(slug)
    )
  }

  function create(input) {
    if (!input?.name?.trim()) {
      throw new Error('Exercise name is required')
    }

    const values = normalizeExerciseInput({
      ...input,
      movement_type: input.movement_type ?? movementTypeFromTags(input.tags)
    })
    const slug = createUniqueExerciseSlug(
      db,
      values.name,
      values.slug
    )

    const result = db
      .prepare(`
        INSERT INTO exercises (
          slug, name, description, category, muscle_group,
          muscles, equipment, difficulty, movement_type, tags, instructions,
          image_url, favourite,
          default_sets, default_reps, default_rest,
          source_type, status,
          seed_key, seed_revision, seed_baseline
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        slug,
        values.name.trim(),
        values.description ?? '',
        values.category ?? '',
        values.muscle_group ?? '',
        values.muscles ?? '[]',
        values.equipment ?? '[]',
        values.difficulty ?? '',
        values.movement_type ?? '',
        values.tags ?? '[]',
        values.instructions ?? '[]',
        values.image_url ?? '',
        values.favourite ?? 0,
        values.default_sets ?? 3,
        values.default_reps ?? '8-12',
        values.default_rest ?? 90,
        values.source_type ?? 'manual',
        values.status ?? 'active',
        values.seed_key ?? null,
        values.seed_revision ?? 0,
        values.seed_baseline ?? null
      )

    return getById(Number(result.lastInsertRowid))
  }

  function update(id, input) {
    const existing = getById(id)

    if (!existing) {
      return null
    }

    const values = normalizeExerciseInput(input)
    const updates = []
    const parameters = []

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (!(field in values)) {
        continue
      }

      updates.push(`${field} = ?`)
      parameters.push(values[field])
    }

    if (updates.length === 0) {
      return existing
    }

    updates.push(`updated_at = datetime('now')`)
    parameters.push(id)

    db.prepare(`
      UPDATE exercises
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...parameters)

    return getById(id)
  }

  function setFavourite(id, favourite) {
    const result = db
      .prepare(`
        UPDATE exercises
        SET favourite = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      .run(favourite ? 1 : 0, id)

    return result.changes === 0 ? null : getById(id)
  }

  function remove(id) {
    const existing = getById(id)
    if (existing?.seed_key) {
      db.prepare(`
        INSERT INTO seed_tombstones (entity_type, seed_key)
        VALUES ('exercise', ?)
        ON CONFLICT(entity_type, seed_key) DO NOTHING
      `).run(existing.seed_key)
    }
    const result = db
      .prepare(`DELETE FROM exercises WHERE id = ?`)
      .run(id)

    return result.changes > 0
  }

  function count({ status = 'active' } = {}) {
    if (status === null) {
      return Number(
        db.prepare(`SELECT COUNT(*) AS count FROM exercises`)
          .get().count
      )
    }

    return Number(
      db.prepare(`
        SELECT COUNT(*) AS count
        FROM exercises
        WHERE status = ?
      `).get(status).count
    )
  }

  return {
    list,
    getById,
    getBySlug,
    create,
    update,
    setFavourite,
    remove,
    count
  }
}
