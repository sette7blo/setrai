import {
  createExerciseService
} from '../exercises/service.js'
import {
  createSessionService
} from '../sessions/service.js'
import {
  calculateRecovery,
  LOOKBACK_DAYS
} from './calculator.js'
import { overallReadiness } from './readiness.js'

const SESSION_LIMIT = 500

export function createRecoveryService(db, options = {}) {
  const sessionService =
    options.sessionService ?? createSessionService(db)
  const exerciseService =
    options.exerciseService ?? createExerciseService(db)
  const getNow = options.now ?? (() => new Date())

  function getRecovery(input = {}) {
    const now = input.now ?? getNow()
    const sessions = sessionService.listCompletedSessions({
      limit: SESSION_LIMIT
    })

    const muscles = calculateRecovery({
      sessions,
      exerciseService,
      now,
      lookbackDays: LOOKBACK_DAYS
    })

    return {
      generatedAt: now.toISOString(),
      lookbackDays: LOOKBACK_DAYS,
      readiness: overallReadiness({ muscles }),
      muscles
    }
  }

  function getMuscleRecovery(muscle, input = {}) {
    return getRecovery(input).muscles.find(
      (item) => item.muscle === muscle
    ) ?? null
  }

  function getReadyMuscles(input = {}) {
    return getRecovery(input).muscles.filter(
      (item) => item.status === 'ready'
    )
  }

  return {
    getRecovery,
    getMuscleRecovery,
    getReadyMuscles
  }
}

export { overallReadiness, recoveryMuscleGroup, workoutReadiness } from './readiness.js'
