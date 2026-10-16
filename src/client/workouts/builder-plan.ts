import type { Exercise } from '../exercises/types.js'
import type { Program, ProgramExercise, ProgramInput, TrainingBlock } from './types.js'

export interface BuilderEntry extends ProgramExercise { section: number; interval: number; workSec: number; superset: string }

const NEW_WORKOUT_DEFAULTS = { sets: 3, reps: '8-12', restSec: 90 }

export function builderEntry(exercise: Exercise, position: number): BuilderEntry {
  return {
    id: null, exerciseId: exercise.id, exerciseSlug: exercise.slug, exerciseName: exercise.name, exercise,
    position, ...NEW_WORKOUT_DEFAULTS,
    weight: null, notes: '', section: 0, interval: 0, workSec: 0, superset: ''
  }
}

export function builderEntries(program: Program): BuilderEntry[] {
  const timed = (program.blocks ?? []).filter(block => block.type === 'emom')
  return program.exercises.map(entry => {
    let section = 0
    let workSec = 0
    let intervalNumber = 0
    let sets = entry.sets
    let restSec = entry.restSec
    timed.forEach((block, index) => {
      for (const [intervalIndex, interval] of (block.intervals ?? []).entries()) {
        const step = interval.steps.find(item => item.exerciseSlug === entry.exerciseSlug)
        if (step) { section = index + 1; intervalNumber = intervalIndex + 1; workSec = step.targetDurationSec ?? 0; sets = block.rounds; restSec = interval.durationSec }
      }
    })
    const straightIndex = program.blocks?.findIndex(block => block.type === 'straight' && (block.steps?.length ?? 0) > 1 && block.steps?.some(step => step.exerciseSlug === entry.exerciseSlug)) ?? -1
    return { ...entry, section, interval: intervalNumber, workSec, sets, restSec, superset: straightIndex >= 0 ? String(straightIndex + 1) : '' }
  })
}

export function buildProgramInput(name: string, description: string, difficulty: string, tags: string[], rows: BuilderEntry[]): ProgramInput {
  if (!name.trim()) throw new Error('Give your program a name.')
  if (!rows.length) throw new Error('Add at least one exercise.')
  for (const row of rows) {
    if (!Number.isInteger(row.sets) || row.sets < 1 || row.sets > 100) throw new Error('Sets and rounds must be between 1 and 100.')
    if (!row.reps.trim() || row.reps.length > 40) throw new Error('Enter reps for each exercise.')
    if (!Number.isInteger(row.restSec) || row.restSec < (row.section ? 1 : 0) || row.restSec > 3600) throw new Error('Enter a valid rest or interval duration.')
    if (!Number.isInteger(row.section) || row.section < 0 || row.section > 100) throw new Error('Enter a valid EMOM section number.')
    if (!Number.isInteger(row.interval) || row.interval < 0 || row.interval > 100) throw new Error('Enter a valid EMOM interval number.')
    if (!Number.isInteger(row.workSec) || row.workSec < 0 || row.workSec > row.restSec) throw new Error('Work duration must fit inside the interval.')
    if (row.weight !== null && (!Number.isFinite(row.weight) || row.weight < 0)) throw new Error('Enter a valid weight.')
  }
  const blocks: TrainingBlock[] = []
  const groups = new Map<string, BuilderEntry[]>()
  for (const row of rows.filter(item => item.section === 0 && item.superset)) {
    groups.set(row.superset, [...(groups.get(row.superset) ?? []), row])
  }
  for (const group of groups.values()) {
    if (group.length < 2) throw new Error('A superset needs at least two exercises in the same group.')
    blocks.push({ type: 'straight', rounds: group[0].sets, restAfterRoundSec: group[0].restSec,
      steps: group.map(row => ({ exerciseSlug: row.exerciseSlug, exerciseName: row.exerciseName, targetReps: row.reps, weight: row.weight, notes: row.notes })) })
  }
  for (const section of [...new Set(rows.map(row => row.section).filter(Boolean))].sort((a, b) => a - b)) {
    const sectionRows = rows.filter(row => row.section === section)
    if (sectionRows.some(row => row.sets !== sectionRows[0].sets)) throw new Error('Exercises in one EMOM section must use the same number of rounds.')
    const intervalGroups = new Map<string, BuilderEntry[]>()
    sectionRows.forEach((row, index) => {
      const key = row.interval ? `group-${row.interval}` : `single-${index}`
      intervalGroups.set(key, [...(intervalGroups.get(key) ?? []), row])
    })
    const intervals = [...intervalGroups.values()].map(group => {
      if (group.some(row => row.restSec !== group[0].restSec)) throw new Error('Exercises sharing an interval must use the same duration.')
      return { durationSec: group[0].restSec, steps: group.map(row => ({ exerciseSlug: row.exerciseSlug, exerciseName: row.exerciseName,
        targetReps: row.reps, ...(row.workSec ? { targetDurationSec: row.workSec } : {}), weight: row.weight, notes: row.notes })) }
    })
    blocks.push({ type: 'emom', rounds: sectionRows[0].sets, intervals,
      totalDurationSec: sectionRows[0].sets * intervals.reduce((sum, interval) => sum + interval.durationSec, 0) })
  }
  return {
    name: name.trim(), description: description.trim(), difficulty, tags, blocks,
    exercises: rows.map((row, position) => ({ exerciseId: row.exerciseId, exerciseSlug: row.exerciseSlug,
      position, sets: row.sets, reps: row.reps, restSeconds: row.restSec, targetWeight: row.weight, notes: row.notes }))
  }
}
