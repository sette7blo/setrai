// src/server/quick-workout/generator.js

import {
  getGoalPreset,
  workoutExerciseCount
} from './constraints.js'
import {
  exerciseMatchesEquipment,
  exerciseMuscles,
  scoreExercise
} from './scoring.js'

const RECOVERY_STAGES = [
  { name: 'ready', minimum: 0.7 },
  { name: 'moderate', minimum: 0.4 },
  { name: 'recovering', minimum: 0 }
]

function clientError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

function buildRecoveryMap(recovery) {
  return new Map(
    recovery.muscles.map((item) => [item.muscle, item])
  )
}

function recentExerciseSlugs(sessions) {
  const mostRecent = sessions[0]

  if (!mostRecent) {
    return new Set()
  }

  return new Set(
    (mostRecent.sets ?? []).map((set) => set.exerciseSlug)
  )
}

function exercisePrescription(exercise, goal) {
  const preset = getGoalPreset(goal)

  if (goal === 'general-fitness') {
    return {
      sets: Number(exercise.default_sets) || preset.sets,
      reps: exercise.default_reps || preset.reps,
      restSec: Number(exercise.default_rest) || preset.restSec
    }
  }

  return {
    sets: preset.sets,
    reps: preset.reps,
    restSec: preset.restSec
  }
}

function buildWorkoutExercise(exercise, goal) {
  return {
    exerciseId: exercise.id,
    exerciseSlug: exercise.slug,
    exerciseName: exercise.name,
    ...exercisePrescription(exercise, goal)
  }
}

function sortScoredExercises(items) {
  return items.sort((a, b) =>
    b.score - a.score ||
    a.exercise.name.localeCompare(b.exercise.name) ||
    a.exercise.slug.localeCompare(b.exercise.slug)
  )
}

function primaryMuscle(exercise) {
  return exerciseMuscles(exercise)[0] ?? 'unknown'
}

function selectBalanced(scored, count, targetMuscles) {
  const selected = []
  const primaryCounts = new Map()
  const limit = targetMuscles.length > 0 ? count : 2

  for (const item of scored) {
    const primary = primaryMuscle(item.exercise)
    const current = primaryCounts.get(primary) ?? 0

    if (current >= limit) {
      continue
    }

    selected.push(item)
    primaryCounts.set(primary, current + 1)

    if (selected.length >= count) {
      return selected
    }
  }

  for (const item of scored) {
    if (selected.includes(item)) {
      continue
    }

    selected.push(item)

    if (selected.length >= count) {
      break
    }
  }

  return selected
}

export function generateQuickWorkout({
  exercises,
  recovery,
  equipment,
  recentSessions,
  durationMinutes,
  goal,
  targetMuscles
}) {
  const recoveryMap = buildRecoveryMap(recovery)
  const recentSlugs = recentExerciseSlugs(recentSessions)
  const desiredCount = workoutExerciseCount(durationMinutes)
  const eligible = exercises.filter((exercise) =>
    exercise.status === 'active' &&
    exerciseMatchesEquipment(exercise, equipment)
  )

  if (eligible.length === 0) {
    throw clientError(
      'Not enough eligible exercises for the selected equipment'
    )
  }

  const scored = sortScoredExercises(
    eligible.map((exercise) => ({
      exercise,
      ...scoreExercise({
        exercise,
        recoveryMap,
        recentSlugs,
        targetMuscles,
        goal
      })
    }))
  )

  let selected = []
  let stageUsed = RECOVERY_STAGES.at(-1).name

  for (const stage of RECOVERY_STAGES) {
    const stageCandidates = scored.filter((item) =>
      item.recovery >= stage.minimum
    )
    selected = selectBalanced(
      stageCandidates,
      desiredCount,
      targetMuscles
    )
    stageUsed = stage.name

    if (selected.length >= Math.min(desiredCount, eligible.length)) {
      break
    }
  }

  if (selected.length === 0) {
    throw clientError(
      'Not enough eligible exercises for the selected equipment'
    )
  }

  return {
    name: 'Quick Workout',
    durationMinutes,
    goal,
    recoveryFallback: stageUsed,
    exercises: selected.map((item) =>
      buildWorkoutExercise(item.exercise, goal)
    )
  }
}
