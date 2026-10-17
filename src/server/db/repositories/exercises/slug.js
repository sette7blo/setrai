function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createUniqueExerciseSlug(
  db,
  name,
  requestedSlug = ''
) {
  const base = slugify(requestedSlug || name)

  if (!base) {
    throw new Error('Exercise requires a valid name or slug')
  }

  let slug = base
  let suffix = 2

  while (
    db
      .prepare(`
        SELECT 1
        FROM exercises
        WHERE slug = ?
      `)
      .get(slug)
  ) {
    slug = `${base}-${suffix}`
    suffix += 1
  }

  return slug
}
