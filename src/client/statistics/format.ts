import { formatDate } from '../shared/formatting/date-format.js'
import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg, formatWeightFromKg } from '../profile/weight-units.js'
import type { StatisticsApiPayload, StatisticsOverview, WeeklyVolumePoint } from './types.js'

export type TrainingRange = '4w' | '3m' | '1y' | 'all'

const RANGE_WEEKS: Record<Exclude<TrainingRange, 'all'>, number> = {
  '4w': 4,
  '3m': 13,
  '1y': 52,
}

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
      currentStreakDays: payload.trainingStreak?.currentStreakDays === undefined ? undefined : Number(payload.trainingStreak.currentStreakDays),
      longestStreakDays: payload.trainingStreak?.longestStreakDays === undefined ? undefined : Number(payload.trainingStreak.longestStreakDays),
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
    { label: 'Training streak', value: `${stats.trainingStreak.currentStreakDays ?? stats.trainingStreak.currentStreakWeeks} ${stats.trainingStreak.currentStreakDays === undefined ? 'weeks' : 'days'}` },
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

export function normalizeTrainingRange(value: string | null): TrainingRange {
  return value === '4w' || value === '3m' || value === '1y' ? value : 'all'
}

export function weeklyVolumeForRange(
  points: WeeklyVolumePoint[],
  range: TrainingRange,
  now = new Date(),
): WeeklyVolumePoint[] {
  const sorted = [...points].sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  if (range === 'all') return sorted

  const currentWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const weekday = currentWeek.getUTCDay() || 7
  currentWeek.setUTCDate(currentWeek.getUTCDate() - weekday + 1)
  const cutoff = new Date(currentWeek)
  cutoff.setUTCDate(cutoff.getUTCDate() - (RANGE_WEEKS[range] - 1) * 7)
  const cutoffKey = cutoff.toISOString().slice(0, 10)
  const currentKey = currentWeek.toISOString().slice(0, 10)
  return sorted.filter(point => point.weekStart >= cutoffKey && point.weekStart <= currentKey)
}

export function recordText(weightKg: number, unit: WeightUnit): string {
  return formatWeightFromKg(weightKg, unit)
}
