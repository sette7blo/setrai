import { ChevronDown } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { displayName } from '../exercises/format.js'
import { programMuscleLabel } from './program-taxonomy.js'
import type { Program, ProgramExercise } from './types.js'

function exerciseRow(entry: ProgramExercise, index: number): HTMLElement {
  const row = document.createElement('details')
  row.className = 'workout-exercise'
  const summary = document.createElement('summary')
  const number = document.createElement('span')
  number.className = 'workout-exercise-index'
  number.textContent = String(index + 1).padStart(2, '0')
  const copy = document.createElement('span')
  const title = document.createElement('strong')
  title.textContent = entry.exerciseName || entry.exercise?.name || displayName(entry.exerciseSlug) || 'Exercise'
  const prescription = document.createElement('small')
  prescription.textContent = `${entry.sets} × ${entry.reps}${entry.weight !== null ? ` @ ${entry.weight} kg` : ''}`
  copy.append(title, prescription)
  const muscle = document.createElement('span')
  muscle.className = 'workout-muscle-pill'
  muscle.textContent = programMuscleLabel(entry.exercise?.muscleGroup ?? '')
  summary.append(number, copy, muscle, iconElement(ChevronDown))
  const grid = document.createElement('div')
  grid.className = 'workout-exercise-stats'
  for (const [value, label] of [[entry.sets, 'Sets'], [entry.reps, 'Reps'], [entry.weight ?? '—', 'kg'], [`${entry.restSec}s`, 'Rest']]) {
    const tile = document.createElement('span')
    const strong = document.createElement('strong')
    strong.textContent = String(value)
    const small = document.createElement('small')
    small.textContent = String(label)
    tile.append(strong, small)
    grid.append(tile)
  }
  row.append(summary, grid)
  if (entry.notes) {
    const notes = document.createElement('p')
    notes.textContent = entry.notes
    row.append(notes)
  }
  if (entry.exerciseId) {
    const link = document.createElement('a')
    link.className = 'workout-exercise-link'
    link.href = `/exercises/${entry.exerciseId}`
    link.textContent = 'Exercise details'
    row.append(link)
  }
  return row
}

export function createProgramBody(program: Program): HTMLElement {
  const body = document.createElement('div')
  body.className = 'workout-card-body'
  if (program.description) {
    const description = document.createElement('p')
    description.className = 'workout-description'
    description.textContent = program.description
    body.append(description)
  }
  const sections = document.createElement('ul')
  sections.className = 'workout-sections'
  for (const block of program.blocks ?? []) {
    const kind = block.type === 'emom' ? 'EMOM' : (block.steps?.length ?? 0) > 1 ? 'Superset' : 'Straight sets'
    const lines = [
      ...(block.intervals ?? []).map(interval => `${interval.durationSec}s: ${interval.steps.map(step => `${step.exerciseName || step.exerciseSlug}${step.targetDurationSec ? ` (${step.targetDurationSec}s work)` : ''}`).join(' + ')}`),
      ...(block.steps?.length ? [block.steps.map(step => step.exerciseName || step.exerciseSlug).join(' + ')] : []),
    ]
    const item = document.createElement('li')
    item.append(Object.assign(document.createElement('strong'), { textContent: `${kind} · ${block.rounds} round${block.rounds === 1 ? '' : 's'}` }))
    for (const line of lines) item.append(Object.assign(document.createElement('span'), { textContent: line }))
    sections.append(item)
  }
  if (sections.childElementCount) body.append(sections)
  const list = document.createElement('div')
  list.className = 'workout-exercise-list'
  program.exercises.forEach((entry, index) => list.append(exerciseRow(entry, index)))
  body.append(list)
  return body
}
