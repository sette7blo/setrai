// src/server/exercises/write.js
// Normalize create/update payloads from API (camelCase or snake_case).
import {
  canonicalCategory,
  canonicalDifficulty,
  canonicalEquipment,
  canonicalMovementType,
  canonicalPrimaryMuscle,
  canonicalSecondaryMuscles
} from './taxonomy.js'

function clientError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function asString(value, field, { max = 500, required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw clientError(`${field} is required`)
    return undefined
  }
  if (typeof value !== 'string') throw clientError(`${field} must be a string`)
  const trimmed = value.trim()
  if (required && !trimmed) throw clientError(`${field} is required`)
  if (trimmed.length > max) throw clientError(`${field} is too long`)
  return trimmed
}

function asStringArray(value, field, { maxItems = 40, maxItem = 80 } = {}) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw clientError(`${field} must be an array`)
  if (value.length > maxItems) throw clientError(`${field} has too many items`)
  return value.map((item, index) => {
    if (typeof item !== 'string') throw clientError(`${field}[${index}] must be a string`)
    const trimmed = item.trim()
    if (!trimmed) return null
    if (trimmed.length > maxItem) throw clientError(`${field}[${index}] is too long`)
    return trimmed
  }).filter(Boolean)
}

function asInteger(value, field, { min, max, fallback } = {}) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  const number = Number(value)
  if (!Number.isInteger(number)) throw clientError(`${field} must be an integer`)
  if (number < min || number > max) throw clientError(`${field} is out of range`)
  return number
}

function pick(input, camel, snake) {
  if (Object.hasOwn(input, camel)) return input[camel]
  if (Object.hasOwn(input, snake)) return input[snake]
  return undefined
}

export function normalizeExerciseWrite(input, { partial = false, requireMovementType = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw clientError('Exercise body must be an object')
  }

  const result = {}

  const name = asString(pick(input, 'name', 'name'), 'name', {
    max: 120,
    required: !partial
  })
  if (name !== undefined) result.name = name

  const description = asString(pick(input, 'description', 'description'), 'description', { max: 5000 })
  if (description !== undefined) result.description = description

  const category = asString(pick(input, 'category', 'category'), 'category', { max: 80 })
  if (category !== undefined) result.category = category ? canonicalCategory(category) : ''

  const muscleGroup = asString(pick(input, 'muscleGroup', 'muscle_group'), 'muscleGroup', { max: 80 })
  if (muscleGroup !== undefined) result.muscle_group = muscleGroup ? canonicalPrimaryMuscle(muscleGroup) : ''

  const muscles = asStringArray(pick(input, 'muscles', 'muscles'), 'muscles')
  if (muscles !== undefined) result.muscles = canonicalSecondaryMuscles(muscles)

  const equipment = asStringArray(pick(input, 'equipment', 'equipment'), 'equipment')
  if (equipment !== undefined) result.equipment = canonicalEquipment(equipment)

  const difficulty = asString(pick(input, 'difficulty', 'difficulty'), 'difficulty', { max: 40 })
  if (difficulty !== undefined) result.difficulty = difficulty ? canonicalDifficulty(difficulty) : ''

  const movementType = asString(pick(input, 'movementType', 'movement_type'), 'movementType', {
    max: 20,
    required: requireMovementType
  })
  if (movementType !== undefined) result.movement_type = movementType ? canonicalMovementType(movementType) : ''

  const tags = asStringArray(pick(input, 'tags', 'tags'), 'tags')
  if (tags !== undefined) result.tags = tags

  const instructions = asStringArray(pick(input, 'instructions', 'instructions'), 'instructions', {
    maxItems: 40,
    maxItem: 2000
  })
  if (instructions !== undefined) result.instructions = instructions

  const imageUrl = asString(pick(input, 'imageUrl', 'image_url'), 'imageUrl', { max: 500 })
  if (imageUrl !== undefined) {
    if (imageUrl && (
      !/^\/(?:images|media\/exercises)\/[a-zA-Z0-9_./-]+$/.test(imageUrl) ||
      imageUrl.split('/').includes('..')
    )) {
      throw clientError('imageUrl must be a local exercise image path')
    }
    result.image_url = imageUrl
  }

  if (Object.hasOwn(input, 'favourite') || Object.hasOwn(input, 'favorite')) {
    result.favourite = Boolean(input.favourite ?? input.favorite)
  }

  const defaultSets = asInteger(pick(input, 'defaultSets', 'default_sets'), 'defaultSets', {
    min: 1,
    max: 50,
    fallback: partial ? undefined : 3
  })
  if (defaultSets !== undefined) result.default_sets = defaultSets

  const defaultReps = asString(pick(input, 'defaultReps', 'default_reps'), 'defaultReps', { max: 40 })
  if (defaultReps !== undefined) result.default_reps = defaultReps
  else if (!partial) result.default_reps = '8-12'

  const defaultRest = asInteger(pick(input, 'defaultRest', 'default_rest'), 'defaultRest', {
    min: 0,
    max: 600,
    fallback: partial ? undefined : 90
  })
  if (defaultRest !== undefined) result.default_rest = defaultRest

  if (!partial) {
    result.source_type = asString(input.source_type, 'source_type', { max: 40 }) || 'manual'
    result.status = asString(input.status, 'status', { max: 40 }) || 'active'
  }

  return result
}
