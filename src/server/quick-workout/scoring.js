// src/server/quick-workout/scoring.js

import {
  getGoalPreset,
  normalizeToken
} from './constraints.js'

function exerciseEquipment(exercise) {
  return Array.isArray(exercise.equipment)
    ? exercise.equipment.map((item) =>
      normalizeToken(item, 'equipment')
    )
    : []
}

export function exerciseMuscles(exercise) {
  const muscles = []

  if (exercise.muscle_group) {
    muscles.push(exercise.muscle_group)
  }

  if (Array.isArray(exercise.muscles)) {
    muscles.push(...exercise.muscles)
  }

  return [...new Set(
    muscles
      .map((item) => normalizeToken(item, 'muscle'))
      .filter(Boolean)
  )]
}

export function exerciseMatchesEquipment(exercise, equipment) {
  const needed = exerciseEquipment(exercise)

  if (needed.length === 0 || needed.includes('bodyweight')) {
    return true
  }

  if (equipment.length === 0) {
    return true
  }

  return needed.every((item) => equipment.includes(item))
}

function recoveryValueForExercise(exercise, recoveryMap) {
  const values = exerciseMuscles(exercise).map((muscle) =>
    recoveryMap.get(muscle)?.recovery ?? 1
  )

  return values.length === 0
    ? 1
    : Math.max(...values)
}

function targetBonus(exercise, targetMuscles) {
  if (targetMuscles.length === 0) {
    return 0
  }

  const muscles = exerciseMuscles(exercise)
  return muscles.some((muscle) => targetMuscles.includes(muscle))
    ? 45
    : 0
}

function recentPenalty(exercise, recentSlugs, goal) {
  if (!recentSlugs.has(exercise.slug)) {
    return 0
  }

  return getGoalPreset(goal).recentPenalty
}

export function scoreExercise({
  exercise,
  recoveryMap,
  recentSlugs,
  targetMuscles,
  goal
}) {
  const recovery = recoveryValueForExercise(
    exercise,
    recoveryMap
  )
  const primaryReady = recovery * 100

  return {
    score:
      primaryReady +
      targetBonus(exercise, targetMuscles) -
      recentPenalty(exercise, recentSlugs, goal),
    recovery
  }
}
