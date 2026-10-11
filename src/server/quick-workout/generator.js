// src/server/quick-workout/generator.js

import {
  getGoalPreset,
  workoutExerciseCount
} from './constraints.js'
import {
  exerciseMatchesEquipment,
  scoreExercise
} from './scoring.js'

import { recoveryMuscleGroup, workoutReadiness } from '../recovery/service.js'

function clientError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

function loggedExerciseSlugs(sessions) {
  return new Set(sessions.flatMap(session => (session.sets ?? [])
    .filter(set => set.done).map(set => set.exerciseSlug)))
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
    muscleGroup: recoveryMuscleGroup(exercise.muscle_group),
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

function selectBalanced(scored, count) {
  const pools = new Map()
  for (const item of scored) {
    if (!pools.has(item.muscle)) pools.set(item.muscle, [])
    pools.get(item.muscle).push(item)
  }
  const selected = []
  while (selected.length < count && [...pools.values()].some(pool => pool.length)) {
    for (const pool of pools.values()) {
      if (pool.length) selected.push(pool.shift())
      if (selected.length === count) break
    }
  }
  return { selected, pools }
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
  targetMuscles = targetMuscles.map(recoveryMuscleGroup).filter(Boolean)
  const recoveryMap = workoutReadiness(recovery)
  const recentSlugs = loggedExerciseSlugs(recentSessions)
  const desiredCount = workoutExerciseCount(durationMinutes)
  const eligible = exercises.filter((exercise) =>
    exercise.status === 'active' &&
    recoveryMuscleGroup(exercise.muscle_group) &&
    (recoveryMap.get(recoveryMuscleGroup(exercise.muscle_group)) ?? 1) >= 0.8 &&
    exerciseMatchesEquipment(exercise, equipment)
  )

  if (eligible.length === 0) {
    throw clientError(
      'No ready muscle groups with exercises for your equipment. Try again after recovery or add exercises.'
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

  const { selected, pools } = selectBalanced(scored, desiredCount)

  return {
    name: 'Quick Workout',
    durationMinutes,
    goal,
    recoveryFallback: 'ready',
    estimatedDurationMinutes: selected.length * 9,
    targetMuscles: [...new Set(selected.map(item => item.muscle))],
    pool: Object.fromEntries([...pools].map(([muscle, items]) => [muscle,
      items.map(item => buildWorkoutExercise(item.exercise, goal))])),
    exercises: selected.map((item) =>
      buildWorkoutExercise(item.exercise, goal)
    )
  }
}
