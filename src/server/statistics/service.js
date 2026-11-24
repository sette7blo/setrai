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
  createProfileService
} from '../profile/service.js'
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
import { calculateExerciseProgress } from './exercise-progress.js'
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
  const profileService =
    options.profileService ?? createProfileService(db)
  const getNow = options.now ?? (() => new Date())
  const getTimeZone = () => profileService.getTimeZone()

  function getCompletedSessions() {
    return sessionService.listCompletedSessions()
  }

  function getTrainingFrequency(sessions = getCompletedSessions(), timeZone = getTimeZone()) {
    const currentWeek = weekStartKey(getNow(), timeZone)

    return {
      totalSessions: sessions.length,
      thisWeek: sessions.filter((session) => {
        const finishedAt = parseSetraiDateTime(
          session.finishedAt
        )
        return finishedAt && weekStartKey(finishedAt, timeZone) === currentWeek
      }).length
    }
  }

  function buildStatistics(sessions) {
    const volumeSets = getVolumeSets(sessions)
    const bodyWeight = getBodyWeightHistory()
    const timeZone = getTimeZone()

    return {
      timeZone,
      trainingFrequency: getTrainingFrequency(sessions, timeZone),
      totalVolume: calculateTotalVolume(volumeSets),
      weeklyVolume: calculateWeeklyVolume(volumeSets, timeZone),
      volumeByExercise: calculateVolumeByExercise(volumeSets),
      volumeByMuscle: calculateVolumeByMuscle(
        volumeSets,
        exerciseService.createLookup()
      ),
      personalRecords: calculatePersonalRecords(volumeSets),
      trainingStreak: calculateTrainingStreak(
        sessions,
        getNow(),
        timeZone
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
      getVolumeSets(getCompletedSessions()),
      getTimeZone()
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
      getNow(),
      getTimeZone()
    )
  }

  // null when no exercise has this slug.
  function getExerciseProgress(slug) {
    const exercise = exerciseService.getExerciseBySlug(slug)
    if (!exercise) return null
    return {
      exercise: { id: exercise.id, slug: exercise.slug, name: exercise.name },
      ...calculateExerciseProgress(sessionService.listFinishedExerciseSets(slug))
    }
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
    getExerciseProgress,
    getBodyWeightHistory
  }
}
