function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugExists(db, slug, ignoreId) {
  const row = db
    .prepare(`
      SELECT id
      FROM programs
      WHERE slug = ?
    `)
    .get(slug)

  return Boolean(
    row && Number(row.id) !== Number(ignoreId)
  )
}

export function createUniqueProgramSlug(
  db,
  name,
  requestedSlug = '',
  ignoreId = null
) {
  const base = slugify(requestedSlug || name)

  if (!base) {
    throw new Error('Program requires a valid name or slug')
  }

  let slug = base
  let suffix = 2

  while (slugExists(db, slug, ignoreId)) {
    slug = `${base}-${suffix}`
    suffix += 1
  }

  return slug
}
