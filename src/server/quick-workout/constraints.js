// src/server/quick-workout/constraints.js
import trainingGoals from '../../shared/training-goals.json' with { type: 'json' }

const MIN_DURATION = 15
const MAX_DURATION = 90
const DEFAULT_DURATION = 30

const GOAL_PRESETS = Object.fromEntries(
  trainingGoals.goals.map(goal => [goal.value, {
    sets: goal.sets,
    reps: goal.reps,
    restSec: goal.restSec,
    recentPenalty: goal.recentPenalty
  }])
)

function clientError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

export function normalizeToken(value, field) {
  if (typeof value !== 'string') {
    throw clientError(`${field} values must be strings`)
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
}

export function normalizeGoal(value, fallback = '') {
  const raw = value ?? fallback ?? 'general-fitness'
  const normalized = normalizeToken(raw, 'goal') ||
    'general-fitness'

  if (!GOAL_PRESETS[normalized]) {
    throw clientError('Invalid quick-workout goal')
  }

  return normalized
}

export function normalizeDuration(value) {
  const duration = value ?? DEFAULT_DURATION
  const number = Number(duration)

  if (!Number.isInteger(number)) {
    throw clientError('Duration must be an integer')
  }

  if (number < MIN_DURATION || number > MAX_DURATION) {
    throw clientError('Duration must be between 15 and 90 minutes')
  }

  return number
}

export function normalizeTargetMuscles(value) {
  if (value === undefined || value === null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw clientError('targetMuscles must be an array')
  }

  return [...new Set(
    value
      .map((item) => normalizeToken(item, 'targetMuscles'))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b))
}

export function workoutExerciseCount(durationMinutes) {
  return Math.max(1, Math.floor(durationMinutes / 9))
}

export function getGoalPreset(goal) {
  return GOAL_PRESETS[goal]
}

export {
  DEFAULT_DURATION,
  GOAL_PRESETS,
  MAX_DURATION,
  MIN_DURATION
}
