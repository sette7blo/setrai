import { muscleRegion } from '../exercises/muscle-map.js'
import { displayName } from '../exercises/format.js'
import type { Program } from './types.js'

export const PROGRAM_GOALS = ['strength', 'hypertrophy', 'conditioning', 'mobility', 'endurance', 'recovery']
export const PROGRAM_FOCUS = ['full-body', 'upper-body', 'lower-body', 'push', 'pull', 'legs', 'core']
export const PROGRAM_FORMATS = ['normal', 'emom', 'superset', 'circuit']

export interface ProgramFilters { search: string; goal: string; focus: string; format: string; level: string; equipment: string }
export const emptyProgramFilters = (): ProgramFilters => ({ search: '', goal: '', focus: '', format: '', level: '', equipment: '' })

export function programMuscles(program: Program): string[] {
  return [...new Set(program.exercises.map(entry => entry.exercise?.muscleGroup ?? '').filter(Boolean))]
}

export function programMuscleLabel(muscle: string): string {
  const value = muscle.trim().toLowerCase().replace(/[ _]+/g, '-')
  if (['biceps', 'triceps', 'brachialis', 'brachioradialis', 'forearms', 'forearm'].includes(value)) return 'Arms'
  if (muscleRegion(muscle) === 'Shoulders' || ['shoulder', 'deltoid', 'supraspinatus'].includes(value)) return 'Shoulders'
  return displayName(muscle)
}

export function programMuscleLabels(program: Program): string[] {
  return [...new Set(programMuscles(program).map(programMuscleLabel))]
}

export function programTaxonomy(program: Program): { goals: string[]; focus: string[]; format: string[]; level: string; equipment: string[] } {
  const muscles = new Set(programMuscles(program).map(muscleRegion))
  const has = (values: string[]): boolean => values.some(value => muscles.has(value))
  const upper = has(['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'])
  const lower = has(['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'])
  const focus = upper && lower ? ['full-body'] : upper ? ['upper-body'] : lower ? ['lower-body'] : []
  if (has(['Chest', 'Shoulders', 'Triceps'])) focus.push('push')
  if (has(['Back', 'Biceps'])) focus.push('pull')
  if (lower) focus.push('legs')
  if (muscles.has('Core')) focus.push('core')
  const emom = program.blocks?.filter(block => block.type === 'emom') ?? []
  const format = [emom.length ? 'emom' : 'normal']
  if (program.blocks?.some(block => block.type === 'straight' && (block.steps?.length ?? 0) > 1)) format.push('superset')
  if (emom.some(block => block.intervals?.some(interval => interval.steps.length > 1))) format.push('circuit')
  return {
    goals: PROGRAM_GOALS.filter(goal => program.tags.map(tag => tag.toLowerCase()).includes(goal)), focus, format,
    level: program.difficulty.toLowerCase(), equipment: [...new Set(program.exercises.flatMap(entry => entry.exercise?.equipment ?? []))]
  }
}

export function matchesProgram(program: Program, filters: ProgramFilters, ownedEquipment: string[] = []): boolean {
  const taxonomy = programTaxonomy(program)
  const text = [program.name, program.description, program.difficulty, ...program.tags, ...taxonomy.focus, ...taxonomy.format, ...taxonomy.equipment].join(' ').toLowerCase()
  return text.includes(filters.search.trim().toLowerCase())
    && (!filters.goal || taxonomy.goals.includes(filters.goal))
    && (!filters.focus || taxonomy.focus.includes(filters.focus))
    && (!filters.format || taxonomy.format.includes(filters.format))
    && (!filters.level || taxonomy.level === filters.level)
    && (!filters.equipment || (filters.equipment === 'my-equipment'
      ? taxonomy.equipment.every(item => item === 'bodyweight' || ownedEquipment.includes(item))
      : taxonomy.equipment.includes(filters.equipment)))
}

export function estimateProgramSeconds(program: Program): number {
  const timedSlugs = new Set(program.blocks?.filter(block => block.type === 'emom').flatMap(block => block.intervals?.flatMap(interval => interval.steps.map(step => step.exerciseSlug)) ?? []) ?? [])
  const straightSlugs = new Set(program.blocks?.filter(block => block.type === 'straight').flatMap(block => block.steps?.map(step => step.exerciseSlug) ?? []) ?? [])
  const strength = program.exercises.filter(entry => !timedSlugs.has(entry.exerciseSlug) || straightSlugs.has(entry.exerciseSlug)).reduce((sum, entry) =>
    sum + entry.sets * 45 + Math.max(0, entry.sets - 1) * entry.restSec, 0)
  return strength + (program.blocks?.filter(block => block.type === 'emom').reduce((sum, block) =>
    sum + (block.totalDurationSec ?? block.rounds * (block.intervals?.reduce((total, interval) => total + interval.durationSec, 0) ?? 0)), 0) ?? 0)
}

export function programFocusLabel(program: Program): string {
  const { goals, focus } = programTaxonomy(program)
  const where = focus[0] === 'full-body' ? 'Full body' : programMuscleLabels(program).slice(0, 2).join(' + ')
  return [goals[0] ? displayName(goals[0]) : '', where].filter(Boolean).join(' · ')
}
