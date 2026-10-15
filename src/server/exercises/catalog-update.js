const FIELDS = [
  'name', 'description', 'category', 'muscle_group', 'muscles', 'equipment',
  'difficulty', 'movement_type', 'tags', 'instructions', 'image_url', 'default_sets',
  'default_reps', 'default_rest'
]

export function catalogBaseline(input) {
  return JSON.stringify(Object.fromEntries(FIELDS.map(field => [field, input[field]])))
}

// Only untouched fields receive remote changes. Legacy imports have no baseline,
// so retain all their local fields until a new baseline has been recorded.
export function catalogUpdate(existing, input, { replaceImage = false } = {}) {
  const baseline = existing.catalog_baseline ? JSON.parse(existing.catalog_baseline) : {}
  const patch = {
    catalog_baseline: catalogBaseline(input),
    nostr_event_id: input.nostr_event_id,
    nostr_published_at: input.nostr_published_at
  }
  for (const field of FIELDS) {
    if (field in baseline && JSON.stringify(existing[field]) === JSON.stringify(baseline[field])) {
      patch[field] = input[field]
    }
  }
  if (replaceImage) patch.image_url = input.image_url
  return patch
}
