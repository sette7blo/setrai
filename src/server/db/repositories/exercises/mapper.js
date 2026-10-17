const JSON_FIELDS = [
  'muscles',
  'equipment',
  'tags',
  'instructions'
]

function parseJson(value, fallback = []) {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function serializeJson(value) {
  return JSON.stringify(
    Array.isArray(value) ? value : []
  )
}

export function mapExercise(row) {
  if (!row) {
    return null
  }

  return {
    ...row,
    muscles: parseJson(row.muscles),
    equipment: parseJson(row.equipment),
    tags: parseJson(row.tags),
    instructions: parseJson(row.instructions),
    favourite: Boolean(row.favourite)
  }
}

export function movementTypeFromTags(tags) {
  if (!Array.isArray(tags)) return ''
  const values = new Set(tags.map(tag => String(tag).trim().toLowerCase()))
  if (values.has('compound')) return 'compound'
  if (values.has('isolation')) return 'isolation'
  return ''
}

export function normalizeExerciseInput(input) {
  const result = {
    ...input
  }

  for (const field of JSON_FIELDS) {
    if (field in result) {
      result[field] = serializeJson(result[field])
    }
  }

  if ('favourite' in result) {
    result.favourite = result.favourite ? 1 : 0
  }

  return result
}
