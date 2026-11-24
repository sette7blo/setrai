// Blocks drive the live session and the server's set-location check, so a
// stored block must always have the shape src/client/workouts/types.ts
// describes. Only the known fields are kept.

const MAX_BLOCKS = 50
const MAX_STEPS = 50
const MAX_INTERVALS = 50

function invalid(message) {
  throw Object.assign(new Error(message), { statusCode: 400 })
}

function isInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max
}

function optionalText(value, max, message) {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.length > max) invalid(message)
  return value
}

function normalizeStep(step, where, slugs, intervalSec) {
  if (!step || typeof step !== 'object' || Array.isArray(step)) invalid(`${where}: step must be an object`)
  if (typeof step.exerciseSlug !== 'string' || !step.exerciseSlug.trim() || step.exerciseSlug.length > 200) {
    invalid(`${where}: step needs an exerciseSlug`)
  }
  if (!slugs.has(step.exerciseSlug)) invalid(`${where}: exercise "${step.exerciseSlug}" is not in the program's exercises`)
  const result = { exerciseSlug: step.exerciseSlug }
  const name = optionalText(step.exerciseName, 300, `${where}: invalid exerciseName`)
  if (name !== undefined) result.exerciseName = name
  if (step.targetReps !== undefined) {
    const reps = typeof step.targetReps === 'number' && Number.isFinite(step.targetReps) ? String(step.targetReps) : step.targetReps
    result.targetReps = optionalText(reps, 40, `${where}: invalid targetReps`)
  }
  if (step.targetDurationSec !== undefined) {
    const limit = intervalSec ?? 86400
    if (!isInteger(step.targetDurationSec, 1, limit)) invalid(`${where}: targetDurationSec must be 1 to ${limit} seconds`)
    result.targetDurationSec = step.targetDurationSec
  }
  if (step.weight !== undefined) {
    if (step.weight !== null && (typeof step.weight !== 'number' || !Number.isFinite(step.weight) || step.weight < 0 || step.weight > 10000)) {
      invalid(`${where}: invalid weight`)
    }
    result.weight = step.weight
  }
  const notes = optionalText(step.notes, 5000, `${where}: invalid notes`)
  if (notes !== undefined) result.notes = notes
  return result
}

function normalizeSteps(steps, where, slugs, intervalSec) {
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > MAX_STEPS) {
    invalid(`${where}: steps must be a list of 1 to ${MAX_STEPS} steps`)
  }
  return steps.map((step, index) => normalizeStep(step, `${where} step ${index + 1}`, slugs, intervalSec))
}

function normalizeBlock(block, index, slugs) {
  const where = `Block ${index + 1}`
  if (!block || typeof block !== 'object' || Array.isArray(block)) invalid(`${where} must be an object`)
  if (block.type !== 'straight' && block.type !== 'emom') invalid(`${where}: type must be "straight" or "emom"`)
  if (!isInteger(block.rounds, 1, 100)) invalid(`${where}: rounds must be a whole number from 1 to 100`)
  const result = { type: block.type, rounds: block.rounds }

  if (block.type === 'straight') {
    result.steps = normalizeSteps(block.steps, where, slugs)
    if (block.restAfterRoundSec !== undefined) {
      if (!isInteger(block.restAfterRoundSec, 0, 3600)) invalid(`${where}: restAfterRoundSec must be 0 to 3600 seconds`)
      result.restAfterRoundSec = block.restAfterRoundSec
    }
  } else {
    if (!Array.isArray(block.intervals) || block.intervals.length === 0 || block.intervals.length > MAX_INTERVALS) {
      invalid(`${where}: intervals must be a list of 1 to ${MAX_INTERVALS} intervals`)
    }
    result.intervals = block.intervals.map((interval, intervalIndex) => {
      const intervalWhere = `${where} interval ${intervalIndex + 1}`
      if (!interval || typeof interval !== 'object' || Array.isArray(interval)) invalid(`${intervalWhere} must be an object`)
      if (!isInteger(interval.durationSec, 1, 3600)) invalid(`${intervalWhere}: durationSec must be 1 to 3600 seconds`)
      return { durationSec: interval.durationSec, steps: normalizeSteps(interval.steps, intervalWhere, slugs, interval.durationSec) }
    })
  }

  if (block.totalDurationSec !== undefined) {
    if (!isInteger(block.totalDurationSec, 0, 100 * MAX_INTERVALS * 3600)) invalid(`${where}: invalid totalDurationSec`)
    result.totalDurationSec = block.totalDurationSec
  }
  return result
}

// slugs: the exercise slugs of the program the blocks belong to; every step
// must name one so live set logging can resolve it.
export function normalizeProgramBlocks(blocks, slugs) {
  if (!Array.isArray(blocks) || blocks.length > MAX_BLOCKS) invalid(`Program blocks must be a list of at most ${MAX_BLOCKS} blocks`)
  const known = new Set(slugs)
  return blocks.map((block, index) => normalizeBlock(block, index, known))
}
