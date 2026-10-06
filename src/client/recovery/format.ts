import { displayName } from '../exercises/format.js'
import { formatRelativeDate } from '../shared/formatting/date-format.js'
import type { RecoveryApiPayload, RecoveryMuscle, RecoveryOverview, RecoveryStatus } from './types.js'

export function normalizeRecovery(payload: RecoveryApiPayload): RecoveryOverview {
  return {
    generatedAt: payload.generatedAt ?? '',
    lookbackDays: Number(payload.lookbackDays ?? 7),
    muscles: (payload.muscles ?? []).map((item) => ({
      muscle: item.muscle,
      recovery: Number(item.recovery ?? 0),
      status: item.status,
      lastTrainedAt: item.lastTrainedAt ?? ''
    }))
  }
}

export function recoveryPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function statusLabel(status: RecoveryStatus): string {
  return status === 'ready' ? 'Ready' : status === 'moderate' ? 'Moderate' : 'Recovering'
}

export function muscleLabel(muscle: string): string {
  return displayName(muscle)
}

export function lastTrainedText(value: string): string {
  return value ? `Last trained ${formatRelativeDate(value)}` : 'No recent training date'
}

export function sortedRecovery(muscles: RecoveryMuscle[]): RecoveryMuscle[] {
  return [...muscles].sort((a, b) => a.recovery - b.recovery || a.muscle.localeCompare(b.muscle))
}
