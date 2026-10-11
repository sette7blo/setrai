import { formatDate } from '../../shared/formatting/date-format.js'
import type { WeightUnit } from '../types.js'
import { formatBodyWeightFromKg } from '../weight-units.js'
import type { BodyWeightEntry } from './types.js'

export function newestFirst(entries: BodyWeightEntry[]): BodyWeightEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

export function oldestFirst(entries: BodyWeightEntry[]): BodyWeightEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
}

export function latestEntryText(entry: BodyWeightEntry | null, unit: WeightUnit): string {
  if (!entry) return 'No weight logged yet'
  return `${formatBodyWeightFromKg(entry.weightKg, unit)} · ${formatDate(entry.date)}`
}

export function bodyWeightSeries(entries: BodyWeightEntry[], unit: WeightUnit): Array<{ label: string, value: number }> {
  return oldestFirst(entries).map((entry) => ({
    label: formatDate(entry.date),
    value: unit === 'lb' ? entry.weightKg * 2.2046226218 : entry.weightKg
  }))
}
