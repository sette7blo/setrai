import taxonomy from '../../shared/exercise-taxonomy.json' with { type: 'json' }

const lists = {
  category: taxonomy.categories,
  primaryMuscle: taxonomy.primaryMuscles,
  secondaryMuscle: taxonomy.secondaryMuscles,
  equipment: taxonomy.equipment,
  difficulty: taxonomy.difficulties,
  movementType: taxonomy.movementTypes
}

function token(value) {
  return value.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
}

function allowed(field) {
  return new Set(lists[field].map(option => option.value))
}

function canonical(value, field, aliasField) {
  const normalized = token(value)
  const aliasMap = aliasField ? taxonomy.aliases[aliasField] : {}
  const resolved = aliasMap[normalized] ?? normalized
  if (!allowed(field).has(resolved)) {
    const label = field === 'primaryMuscle' ? 'muscleGroup' : field
    const error = new Error(`${label} must use a supported value`)
    error.statusCode = 400
    throw error
  }
  return resolved
}

export function canonicalCategory(value) {
  return canonical(value, 'category')
}

export function canonicalPrimaryMuscle(value) {
  return canonical(value, 'primaryMuscle', 'primaryMuscles')
}

export function canonicalSecondaryMuscles(values) {
  const result = values.map(value => canonical(value, 'secondaryMuscle', 'secondaryMuscles'))
  return [...new Set(result)]
}

export function canonicalEquipment(values) {
  const result = values.map(value => canonical(value, 'equipment', 'equipment'))
  return [...new Set(result)]
}

export function canonicalDifficulty(value) {
  return canonical(value, 'difficulty')
}

export function canonicalMovementType(value) {
  return canonical(value, 'movementType')
}

export const exerciseTaxonomy = taxonomy
