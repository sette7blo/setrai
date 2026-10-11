function invalid(message) {
  const error = new Error(message)
  error.statusCode = 400
  throw error
}

export function validateProgramInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Program must be an object')
  if (!partial || input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 300) invalid('Program name is required (maximum 300 characters)')
  }
  for (const key of ['description', 'difficulty']) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > (key === 'description' ? 10000 : 100))) invalid(`Invalid program ${key}`)
  }
  if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 100 || input.tags.some(tag => typeof tag !== 'string' || tag.length > 100))) invalid('Invalid program tags')
  if (input.exercises !== undefined) {
    if (!Array.isArray(input.exercises) || input.exercises.length > 100) invalid('Program exercises must be an array of at most 100 entries')
    for (const entry of input.exercises) {
      if (!entry || typeof entry !== 'object') invalid('Invalid program exercise')
      if (entry.sets !== undefined && (!Number.isInteger(entry.sets) || entry.sets < 1 || entry.sets > 100)) invalid('Sets must be between 1 and 100')
      const rest = entry.restSeconds ?? entry.rest_sec
      if (rest !== undefined && (!Number.isInteger(rest) || rest < 0 || rest > 3600)) invalid('Rest must be between 0 and 3600 seconds')
      const weight = entry.targetWeight ?? entry.weight
      if (weight !== undefined && weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 10000)) invalid('Invalid target weight')
      if (entry.reps !== undefined && (typeof entry.reps !== 'string' || !entry.reps.trim() || entry.reps.length > 40)) invalid('Reps are required (maximum 40 characters)')
      if (entry.notes !== undefined && (typeof entry.notes !== 'string' || entry.notes.length > 5000)) invalid('Invalid exercise notes')
    }
  }
}
