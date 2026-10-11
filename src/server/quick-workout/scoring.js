import { recoveryMuscleGroup } from '../recovery/service.js'
// src/server/quick-workout/scoring.js

import {
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

export function scoreExercise({ exercise, recoveryMap, recentSlugs, targetMuscles }) {
  const muscle = recoveryMuscleGroup(exercise.muscle_group)
  const recovery = recoveryMap.get(muscle) ?? 1
  const compound = (exercise.tags ?? []).some(tag => String(tag).toLowerCase() === 'compound')
  return {
    muscle,
    recovery,
    score: Number(recentSlugs.has(exercise.slug)) + Number(compound) +
      (targetMuscles.includes(muscle) ? 10 : 0)
  }
}
