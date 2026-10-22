import type { WeightUnit } from './types.js'

export const KG_PER_LB = 1 / 2.2046226218
export const LB_PER_KG = 2.2046226218

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

export function roundWeight(value: number): number {
  return Math.round(value * 10) / 10
}

export function displayWeightFromKg(weightKg: number, unit: WeightUnit): number {
  return roundWeight(unit === 'lb' ? kgToLb(weightKg) : weightKg)
}

export function inputWeightToKg(weight: number, unit: WeightUnit): number {
  if (unit === 'kg') return roundWeight(weight)
  // One decimal kilogram is too coarse to round-trip one decimal pound.
  // Keep gram-level precision at the storage boundary, then round only for display.
  return Math.round(lbToKg(weight) * 1000) / 1000
}

export function formatWeightFromKg(weightKg: number, unit: WeightUnit): string {
  return `${displayWeightFromKg(weightKg, unit).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`
}

export function formatBodyWeightFromKg(weightKg: number, unit: WeightUnit): string {
  return `${displayWeightFromKg(weightKg, unit).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`
}

export function formatVolumeKg(volumeKg: number, unit: WeightUnit): string {
  const value = unit === 'lb' ? kgToLb(volumeKg) : volumeKg
  const suffix = unit === 'lb' ? 'lb' : 'kg'
  return `${Math.round(value).toLocaleString()} ${suffix}`
}
