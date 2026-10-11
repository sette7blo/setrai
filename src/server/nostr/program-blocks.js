function integer(value, fallback, min, max) {
  const result = value === undefined ? fallback : Number(value)
  if (!Number.isInteger(result) || result < min || result > max) throw new Error('Invalid block duration')
  return result
}

function steps(value) {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error('Invalid block steps')
  return value.map(step => {
    if (!step || typeof step !== 'object') throw new Error('Invalid step')
    const slug = step.exerciseSlug || step.slug
    if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,180}$/.test(slug)) throw new Error('Invalid step exercise')
    const result = { exerciseSlug: slug }
    for (const key of ['exerciseName', 'targetReps', 'notes']) {
      if (step[key] !== undefined) {
        if (typeof step[key] !== 'string' || step[key].length > 5000) throw new Error('Invalid step text')
        result[key] = step[key]
      }
    }
    if (step.targetDurationSec !== undefined) result.targetDurationSec = integer(step.targetDurationSec, 0, 1, 3600)
    if (step.weight !== undefined && step.weight !== null) {
      if (!Number.isFinite(Number(step.weight)) || Number(step.weight) < 0 || Number(step.weight) > 10000) throw new Error('Invalid step weight')
      result.weight = Number(step.weight)
    }
    return result
  })
}

export function parseProgramBlocks(value) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid training blocks')
  return value.map(block => {
    if (!block || typeof block !== 'object') throw new Error('Invalid training block')
    const rounds = integer(block.rounds, 1, 1, 100)
    if (block.type === 'straight') return {
      type: 'straight', rounds, steps: steps(block.steps),
      restAfterRoundSec: integer(block.restAfterRoundSec, 0, 0, 3600)
    }
    if (block.type !== 'emom' || !Array.isArray(block.intervals) || !block.intervals.length || block.intervals.length > 100) throw new Error('Invalid EMOM block')
    const intervals = block.intervals.map(interval => ({
      durationSec: integer(interval.durationSec, 60, 1, 3600), steps: steps(interval.steps)
    }))
    const totalDurationSec = integer(block.totalDurationSec, rounds * intervals.reduce((sum, interval) => sum + interval.durationSec, 0), 1, 86400)
    return { type: 'emom', rounds, intervals, totalDurationSec }
  })
}
