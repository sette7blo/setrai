import type { BodyWeightEntry } from './types.js'

export function newestFirst(entries: BodyWeightEntry[]): BodyWeightEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}

export function oldestFirst(entries: BodyWeightEntry[]): BodyWeightEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
}
