// src/server/db/repositories/exercises/mapper.js

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
