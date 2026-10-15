import taxonomyData from '../../shared/exercise-taxonomy.json' with { type: 'json' }

export interface TaxonomyOption {
  value: string
  label: string
}

interface SecondaryTaxonomyOption extends TaxonomyOption {
  recoveryGroup: string
}

export const EXERCISE_CATEGORIES = taxonomyData.categories as TaxonomyOption[]
export const PRIMARY_MUSCLES = taxonomyData.primaryMuscles as TaxonomyOption[]
export const RECOVERY_GROUPS = taxonomyData.recoveryGroups as TaxonomyOption[]
export const SECONDARY_MUSCLES = taxonomyData.secondaryMuscles as SecondaryTaxonomyOption[]
export const EXERCISE_EQUIPMENT = taxonomyData.equipment as TaxonomyOption[]
export const EXERCISE_DIFFICULTIES = taxonomyData.difficulties as TaxonomyOption[]
export const MOVEMENT_TYPES = taxonomyData.movementTypes as TaxonomyOption[]

type AliasGroup = keyof typeof taxonomyData.aliases

function token(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
}

const recoveryLabels = new Map(RECOVERY_GROUPS.map(option => [option.value, option.label]))
const recoveryGroupByMuscle = new Map<string, string>()
for (const option of PRIMARY_MUSCLES) recoveryGroupByMuscle.set(option.value, option.value)
for (const option of SECONDARY_MUSCLES) recoveryGroupByMuscle.set(option.value, option.recoveryGroup)
for (const [alias, target] of Object.entries(taxonomyData.aliases.primaryMuscles)) {
  recoveryGroupByMuscle.set(alias, target)
}
for (const [alias, target] of Object.entries(taxonomyData.aliases.secondaryMuscles)) {
  const group = recoveryGroupByMuscle.get(target)
  if (group) recoveryGroupByMuscle.set(alias, group)
}

export function recoveryMuscleRegion(value: string): string | undefined {
  const group = recoveryGroupByMuscle.get(token(value))
  return group ? recoveryLabels.get(group) : undefined
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
