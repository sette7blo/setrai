import { ChevronDown, Copy, Pencil, Play, Trash2 } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { muscleMapMarkupForMuscles } from '../exercises/muscle-map.js'
import { displayName } from '../exercises/format.js'
import { readableApiError } from '../shared/api/errors.js'

import type { Program } from './types.js'
import { createProgramBody } from './program-preview.js'
import { estimateProgramSeconds, programMuscles, programTaxonomy } from './program-taxonomy.js'

export interface ProgramCardActions {
  start?: (program: Program) => Promise<void>
  edit?: (program: Program) => void
  duplicate?: (program: Program) => Promise<void>
  remove?: (program: Program) => Promise<void>
}

export function createProgramCard(program: Program, actions: ProgramCardActions): HTMLElement {
  const card = document.createElement('details')
  card.className = 'workout-card'
  const summary = document.createElement('summary')
  summary.className = 'workout-card-header'
  summary.setAttribute('aria-label', `Expand ${program.name}`)
  const map = document.createElement('span')
  map.className = 'workout-card-map'
  const muscles = programMuscles(program)
  map.innerHTML = muscleMapMarkupForMuscles(muscles, program.exercises.flatMap(entry => entry.exercise?.muscles ?? []))
  map.querySelector('svg')?.setAttribute('aria-hidden', 'true')
  const copy = document.createElement('span')
  copy.className = 'workout-card-info'
  const name = document.createElement('strong')
  name.className = 'workout-card-name'
  name.textContent = program.name
  const meta = document.createElement('span')
  meta.className = 'workout-card-meta'
  meta.textContent = [displayName(program.difficulty), `${Math.max(1, Math.round(estimateProgramSeconds(program) / 60))} min`].filter(Boolean).join(' · ')
  const formats = programTaxonomy(program).format.filter(value => value !== 'normal').map(value => value === 'emom' ? 'EMOM' : displayName(value))
  const figures = document.createElement('span')
  figures.className = 'workout-card-figures'
  figures.textContent = [`${program.exercises.length} exercise${program.exercises.length === 1 ? '' : 's'}`, ...formats].join(' · ')
  copy.append(name, meta, figures)
  summary.append(map, copy, iconElement(ChevronDown))
  const body = createProgramBody(program)
  const bar = document.createElement('div')
  bar.className = 'workout-card-actions'
  const error = document.createElement('p')
  error.className = 'workout-action-error'
  error.setAttribute('role', 'status')
  const action = (key: string, label: string, icon: typeof Play, run: () => void | Promise<void>, style: string): HTMLButtonElement => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `button workout-card-action workout-card-action--${key} ${style}`
    button.setAttribute('aria-label', `${label} ${program.name}`)
    button.append(iconElement(icon), document.createTextNode(label))
    button.addEventListener('click', () => {
      button.disabled = true
      error.textContent = ''
      void Promise.resolve().then(run).catch(reason => { error.textContent = readableApiError(reason) }).finally(() => { button.disabled = false })
    })
    return button
  }
  // Starting is the one accent action and comes first; managing the program is a quiet row, Delete last.
  if (actions.start) body.prepend(action('start', 'Start', Play, () => actions.start!(program), 'button--accent'))
  if (actions.edit) bar.append(action('edit', 'Edit', Pencil, () => actions.edit!(program), 'button--secondary'))
  if (actions.duplicate) bar.append(action('duplicate', 'Duplicate', Copy, () => actions.duplicate!(program), 'button--secondary'))
  if (actions.remove) bar.append(action('delete', 'Delete', Trash2, () => actions.remove!(program), 'button--secondary'))

  body.append(bar, error)
  card.append(summary, body)
  card.addEventListener('toggle', () => { summary.setAttribute('aria-label', `${card.open ? 'Collapse' : 'Expand'} ${program.name}`) })
  return card
}
