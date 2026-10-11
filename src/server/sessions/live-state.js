function invalid(message) {
  const error = new Error(message)
  error.statusCode = 400
  throw error
}

export function normalizeLiveState(input, previous = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Invalid live state')
  const result = { ...previous }
  for (const [key, value] of Object.entries(input)) {
    if (['exerciseIndex', 'emomPositionSec', 'emomActiveSec', 'restEndsAt', 'restDurationSec', 'restNextIndex'].includes(key)) {
      if (value === null && ['restEndsAt', 'restNextIndex'].includes(key)) result[key] = null
      else {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > (key === 'restEndsAt' ? 1e14 : 1e7)) invalid('Invalid session timer')
        result[key] = value
      }
    } else if (['emomStartedAt', 'emomRunningSince'].includes(key)) {
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e14)) invalid('Invalid EMOM clock')
      result[key] = value
    } else if (key === 'mode') {
      if (!['strength', 'emom'].includes(value)) invalid('Invalid training mode')
      result[key] = value
    } else if (key === 'setCounts') {
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 500) invalid('Invalid set counts')
      result[key] = {}
      for (const [slug, count] of Object.entries(value)) {
        if (!/^[a-zA-Z0-9_-]{1,200}$/.test(slug) || !Number.isInteger(count) || count < 1 || count > 100) invalid('Invalid set count')
        result[key][slug] = count
      }
    } else invalid('Unknown live session field')
  }
  return result
}

export function normalizeSetContext(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Invalid set input')
  const context = {}
  for (const key of ['blockIndex', 'roundIndex', 'intervalIndex', 'stepIndex', 'durationSec']) {
    if (input[key] === undefined) continue
    const value = input[key]
    if (!Number.isInteger(value) || value < 0 || value > 86400 || (key === 'durationSec' && value === 0)) invalid('Invalid timed set')
    context[key] = value
  }
  return context
}

export function validateSetLocation(context, session, slug) {
  if (context.blockIndex === undefined) {
    if (['roundIndex', 'intervalIndex', 'stepIndex'].some((key) => context[key] !== undefined)) invalid('Incomplete set location')
    return
  }
  const block = session.blocks?.[context.blockIndex]
  if (!block || context.roundIndex === undefined || context.stepIndex === undefined) invalid('Invalid set location')
  const steps = block.type === 'emom' ? block.intervals?.[context.intervalIndex]?.steps : block.steps
  const step = steps?.[context.stepIndex]
  if (!step || step.exerciseSlug !== slug || (block.type === 'straight' && context.intervalIndex !== undefined)) invalid('Exercise does not match the interval')
  if (context.durationSec && block.type === 'emom' && context.durationSec > block.intervals[context.intervalIndex].durationSec) invalid('Timed work exceeds the interval')
}
