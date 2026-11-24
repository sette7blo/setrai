import {
  createBodyService
} from '../body/service.js'
import {
  createExerciseService
} from '../exercises/service.js'
import {
  createSessionService
} from '../sessions/service.js'
import {
  getBodyWeightChange,
  getChronologicalBodyWeight
} from './body-weight.js'
import {
  parseSetraiDateTime,
  weekStartKey
} from './dates.js'
import {
  calculatePersonalRecords
} from './records.js'
import {
  calculateTrainingStreak
} from './streak.js'
import {
  calculateTotalVolume,
  calculateVolumeByExercise,
  calculateVolumeByMuscle,
  calculateWeeklyVolume,
  getVolumeSets
} from './volume.js'

export function createStatisticsService(db, options = {}) {
  const sessionService =
    options.sessionService ?? createSessionService(db)
  const exerciseService =
    options.exerciseService ?? createExerciseService(db)
  const bodyService =
    options.bodyService ?? createBodyService(db)
  const getNow = options.now ?? (() => new Date())

  function getCompletedSessions() {
    return sessionService.listCompletedSessions()
  }

  function getTrainingFrequency(sessions = getCompletedSessions()) {
    const currentWeek = weekStartKey(getNow())

    return {
      totalSessions: sessions.length,
      thisWeek: sessions.filter((session) => {
        const finishedAt = parseSetraiDateTime(
          session.finishedAt
        )
        return finishedAt && weekStartKey(finishedAt) === currentWeek
      }).length
    }
  }

  function buildStatistics(sessions) {
    const volumeSets = getVolumeSets(sessions)
    const bodyWeight = getBodyWeightHistory()

    return {
      trainingFrequency: getTrainingFrequency(sessions),
      totalVolume: calculateTotalVolume(volumeSets),
      weeklyVolume: calculateWeeklyVolume(volumeSets),
      volumeByExercise: calculateVolumeByExercise(volumeSets),
      volumeByMuscle: calculateVolumeByMuscle(
        volumeSets,
        exerciseService.createLookup()
      ),
      personalRecords: calculatePersonalRecords(volumeSets),
      trainingStreak: calculateTrainingStreak(
        sessions,
        getNow()
      ),
      bodyWeight,
      bodyWeightChangeKg: getBodyWeightChange(bodyWeight)
    }
  }

  function getOverview() {
    return buildStatistics(getCompletedSessions())
  }

  function getWeeklyVolume() {
    return calculateWeeklyVolume(
      getVolumeSets(getCompletedSessions())
    )
  }

  function getVolumeByExercise() {
    return calculateVolumeByExercise(
      getVolumeSets(getCompletedSessions())
    )
  }

  function getVolumeByMuscle() {
    return calculateVolumeByMuscle(
      getVolumeSets(getCompletedSessions()),
      exerciseService.createLookup()
    )
  }

  function getPersonalRecords() {
    return calculatePersonalRecords(
      getVolumeSets(getCompletedSessions())
    )
  }

  function getTrainingStreak() {
    return calculateTrainingStreak(
      getCompletedSessions(),
      getNow()
    )
  }

  function getBodyWeightHistory() {
    return getChronologicalBodyWeight(bodyService)
  }

  return {
    getOverview,
    getTrainingFrequency,
    getWeeklyVolume,
    getVolumeByExercise,
    getVolumeByMuscle,
    getPersonalRecords,
    getTrainingStreak,
    getBodyWeightHistory
  }
}
