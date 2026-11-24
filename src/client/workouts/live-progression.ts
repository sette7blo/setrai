import type { WeightUnit } from '../profile/types.js'
import { displayWeightFromKg, formatWeightFromKg } from '../profile/weight-units.js'
import type { LastPerformance } from './types.js'

type LastSet = LastPerformance['sets'][number]

const INCREMENT: Record<WeightUnit, number> = { kg: 2.5, lb: 5 }

// The same set number from last time, or last time's final set when this
// session goes beyond it.
export function lastTimeSet(last: LastPerformance | null | undefined, setNumber: number): LastSet | null {
  if (!last?.sets.length) return null
  return last.sets.find(set => set.setNumber === setNumber) ?? last.sets.at(-1)!
}

export function lastTimeText(set: LastSet, unit: WeightUnit): string {
  if (set.durationSec) return `Last time: ${set.durationSec} s`
  if (!set.weight) return `Last time: ${set.reps} reps`
  return `Last time: ${formatWeightFromKg(set.weight, unit)} x ${set.reps}`
}

// Top of the prescribed range: "6-8" -> 8, "10" -> 10. Anything else ("AMRAP",
// "30s") has no numeric target and gets no hint.
export function topOfRepRange(reps: string): number | null {
  const match = /^\s*(?:\d+\s*[-–]\s*)?(\d+)\s*$/.exec(reps)
  return match ? Number(match[1]) : null
}

// Double progression: every done set last time reached the top of the range,
// so add one increment; otherwise repeat. Advisory only, in the display unit.
export function progressionHint(last: LastPerformance | null | undefined, targetReps: string, unit: WeightUnit): string | null {
  const top = topOfRepRange(targetReps)
  if (top === null || !last?.sets.length || last.sets.some(set => set.durationSec)) return null
  const weights = last.sets.map(set => set.weight ?? 0)
  const heaviest = Math.max(...weights)
  if (heaviest <= 0) return null
  const shown = displayWeightFromKg(heaviest, unit)
  if (last.sets.every(set => set.reps >= top)) {
    // Whole pounds, or half kilograms, so the suggestion is a loadable number.
    const precision = unit === 'lb' ? 1 : 0.5
    const next = Math.round((shown + INCREMENT[unit]) / precision) * precision
    return `Try ${next.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`
  }
  return `Repeat ${shown.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`
}
