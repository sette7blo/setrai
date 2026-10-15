import taxonomyData from '../../shared/exercise-taxonomy.json' with { type: 'json' }

export interface TaxonomyOption {
  value: string
  label: string
}

export const EXERCISE_CATEGORIES = taxonomyData.categories as TaxonomyOption[]
export const PRIMARY_MUSCLES = taxonomyData.primaryMuscles as TaxonomyOption[]
export const SECONDARY_MUSCLES = taxonomyData.secondaryMuscles as TaxonomyOption[]
export const EXERCISE_EQUIPMENT = taxonomyData.equipment as TaxonomyOption[]
export const EXERCISE_DIFFICULTIES = taxonomyData.difficulties as TaxonomyOption[]
export const MOVEMENT_TYPES = taxonomyData.movementTypes as TaxonomyOption[]

type AliasGroup = keyof typeof taxonomyData.aliases

function token(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
}

function normalize(value: string, options: TaxonomyOption[], aliases?: AliasGroup): string {
  const normalized = token(value)
  if (options.some(option => option.value === normalized)) return normalized
  if (!aliases) return normalized
  const aliasMap = taxonomyData.aliases[aliases] as Record<string, string>
  return aliasMap[normalized] ?? normalized
}

export function normalizePrimaryMuscle(value: string): string {
  return normalize(value, PRIMARY_MUSCLES, 'primaryMuscles')
}

export function normalizeSecondaryMuscle(value: string): string {
  return normalize(value, SECONDARY_MUSCLES, 'secondaryMuscles')
}

export function normalizeEquipment(value: string): string {
  return normalize(value, EXERCISE_EQUIPMENT, 'equipment')
}

export function canonicalSelection(values: string[], options: TaxonomyOption[], normalizeValue: (value: string) => string): string[] {
  const allowed = new Set(options.map(option => option.value))
  return [...new Set(values.map(normalizeValue).filter(value => allowed.has(value)))]
}
