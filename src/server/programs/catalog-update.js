export const CATALOG_FIELDS = ['name', 'description', 'difficulty', 'tags', 'plan']

export function programSnapshot(program) {
  return {
    name: program.name, description: program.description || '', difficulty: program.difficulty || '', tags: program.tags || [],
    plan: { blocks: program.blocks || [], exercises: program.exercises.map((entry, position) => ({
      exerciseSlug: entry.exerciseSlug ?? entry.address?.split(':').at(-1), position: entry.position ?? position,
      sets: entry.sets, reps: entry.reps, restSeconds: entry.restSeconds ?? entry.restSec,
      targetWeight: entry.targetWeight ?? entry.weight ?? null, notes: entry.notes || ''
    })) }
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

export function programUpdateReview(existing, incoming) {
  const current = programSnapshot(existing)
  const latest = programSnapshot(incoming)
  const baseline = existing.catalogBaseline
  return { legacy: !baseline, fields: CATALOG_FIELDS.map(field => ({
    field, changed: !same(current[field], latest[field]),
    apply: Boolean(baseline && same(current[field], baseline[field]))
  })) }
}
