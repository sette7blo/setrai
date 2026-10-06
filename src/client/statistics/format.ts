import { formatDate } from '../shared/formatting/date-format.js'
import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg, formatWeightFromKg } from '../profile/weight-units.js'
import type { StatisticsApiPayload, StatisticsOverview, WeeklyVolumePoint } from './types.js'

export function normalizeStatistics(payload: StatisticsApiPayload): StatisticsOverview {
  return {
    trainingFrequency: {
      totalSessions: Number(payload.trainingFrequency?.totalSessions ?? 0),
      thisWeek: Number(payload.trainingFrequency?.thisWeek ?? 0)
    },
    totalVolume: Number(payload.totalVolume ?? 0),
    weeklyVolume: payload.weeklyVolume ?? [],
    volumeByExercise: payload.volumeByExercise ?? [],
    volumeByMuscle: payload.volumeByMuscle ?? [],
    personalRecords: payload.personalRecords ?? [],
    trainingStreak: {
      currentStreakWeeks: Number(payload.trainingStreak?.currentStreakWeeks ?? 0),
      longestStreakWeeks: Number(payload.trainingStreak?.longestStreakWeeks ?? 0)
    },
    bodyWeight: payload.bodyWeight ?? []
  }
}

export function hasTrainingHistory(stats: StatisticsOverview): boolean {
  return stats.trainingFrequency.totalSessions > 0
}

export function overviewItems(stats: StatisticsOverview, unit: WeightUnit): Array<{ label: string, value: string }> {
  return [
    { label: 'This week', value: `${stats.trainingFrequency.thisWeek} workouts` },
    { label: 'Training streak', value: `${stats.trainingStreak.currentStreakWeeks} weeks` },
    { label: 'Total volume', value: formatVolumeKg(stats.totalVolume, unit) }
  ]
}

export function weeklyChartSeries(points: WeeklyVolumePoint[], unit: WeightUnit): Array<{ label: string, value: number, text: string }> {
  return points.map((point) => ({
    label: formatDate(point.weekStart),
    value: unit === 'lb' ? point.volume * 2.2046226218 : point.volume,
    text: formatVolumeKg(point.volume, unit)
  }))
}

export function recordText(weightKg: number, unit: WeightUnit): string {
  return formatWeightFromKg(weightKg, unit)
}
