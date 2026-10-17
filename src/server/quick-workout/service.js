import {
  createExerciseService
} from '../exercises/service.js'
import {
  createProfileService
} from '../profile/service.js'
import {
  createProgramService
} from '../programs/service.js'
import {
  createRecoveryService
} from '../recovery/service.js'
import {
  createSessionService
} from '../sessions/service.js'
import {
  normalizeDuration,
  normalizeGoal,
  normalizeTargetMuscles,
  normalizeToken
} from './constraints.js'
import {
  generateQuickWorkout
} from './generator.js'

const RECENT_SESSION_LIMIT = 5

function normalizeEquipment(equipment) {
  return equipment
    .map((item) => normalizeToken(item, 'equipment'))
    .filter(Boolean)
}

export function createQuickWorkoutService(db, options = {}) {
  const exerciseService =
    options.exerciseService ?? createExerciseService(db)
  const profileService =
    options.profileService ?? createProfileService(db)
  const programService =
    options.programService ?? createProgramService(db)
  const recoveryService =
    options.recoveryService ?? createRecoveryService(db)
  const sessionService =
    options.sessionService ?? createSessionService(db)

  function validateWorkoutPlan(workout) {
    if (!workout || typeof workout !== 'object' || Array.isArray(workout)) {
      throw Object.assign(new Error('Quick Workout plan is required'), { statusCode: 400 })
    }

    if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) {
      throw Object.assign(new Error('Quick Workout plan must include exercises'), { statusCode: 400 })
    }

    return workout
  }

  function programInputFromWorkout(workout) {
    const plan = validateWorkoutPlan(workout)

    return {
      name: plan.name || 'Quick Workout',
      description: `Generated from your recovery, equipment, and training goal for ${plan.durationMinutes || 30} minutes.`,
      difficulty: plan.goal || '',
      tags: ['quick-workout'],
      isTemporary: true,
      exercises: plan.exercises.map((exercise, index) => ({
        exerciseId: exercise.exerciseId,
        position: index,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSec,
        notes: 'Generated Quick Workout prescription'
      }))
    }
  }

  function generate(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      const error = new Error('Quick Workout request must be an object')
      error.statusCode = 400
      throw error
    }

    const durationMinutes = normalizeDuration(
      input.durationMinutes
    )
    const goal = normalizeGoal(
      input.goal,
      profileService.getTrainingGoal()
    )
    const targetMuscles = normalizeTargetMuscles(
      input.targetMuscles
    )
    const equipment = normalizeEquipment(
      input.equipment ?? profileService.getEquipment()
    )

    return generateQuickWorkout({
      exercises: exerciseService.listExercises(),
      recovery: recoveryService.getRecovery(),
      equipment,
      recentSessions: sessionService.listCompletedSessions({
        limit: RECENT_SESSION_LIMIT
      }),
      durationMinutes,
      goal,
      targetMuscles
    })
  }

  function start(input = {}) {
    const workout = input.workout ?? generate(input)
    const program = programService.createProgram(
      programInputFromWorkout(workout)
    )
    const session = sessionService.startSession({
      programId: program.id
    })

    return {
      workout,
      program,
      session
    }
  }

  return { generate, start }
}
