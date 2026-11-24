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

const DAY_MS = 24 * 60 * 60 * 1000

export function createRecoveryService(db, options = {}) {
  const sessionService =
    options.sessionService ?? createSessionService(db)
  const exerciseService =
    options.exerciseService ?? createExerciseService(db)
  const getNow = options.now ?? (() => new Date())

  function getRecovery(input = {}) {
    const now = input.now ?? getNow()
    // Coarse date filter with a day of slack for any stored time format; the
    // calculator applies the exact cutoff.
    const finishedAfter = new Date(now.getTime() - (LOOKBACK_DAYS + 1) * DAY_MS).toISOString().slice(0, 10)
    const sessions = sessionService.listCompletedSessions({ finishedAfter })

    const muscles = calculateRecovery({
      sessions,
      exerciseService: exerciseService.createLookup(),
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
