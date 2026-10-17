import { ChevronDown, Copy, Pencil, Play, Trash2 } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { muscleMapMarkupForMuscles } from '../exercises/muscle-map.js'
import { displayName } from '../exercises/format.js'
import { readableApiError } from '../shared/api/errors.js'

import type { Program } from './types.js'
import { createProgramBody } from './program-preview.js'
import { estimateProgramSeconds, programFocusLabel, programMuscles, programTaxonomy } from './program-taxonomy.js'

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
  const titleRow = document.createElement('span')
  titleRow.className = 'workout-card-title-row'
  const name = document.createElement('strong')
  name.className = 'workout-card-name'
  name.textContent = program.name
  titleRow.append(name)

  const byline = document.createElement('span')
  byline.className = 'workout-card-byline'
  byline.textContent = displayName(program.difficulty)
  const meta = document.createElement('span')
  meta.className = 'workout-card-meta'
  const formats = programTaxonomy(program).format.filter(value => value !== 'normal').map(value => value === 'emom' ? 'EMOM' : displayName(value))
  meta.textContent = [`${Math.max(1, Math.round(estimateProgramSeconds(program) / 60))} min`, ...formats, `${program.exercises.length} exercises`].join(' · ')
  const focus = document.createElement('span')
  focus.className = 'workout-card-focus'
  focus.textContent = programFocusLabel(program)
  copy.append(titleRow, byline, meta, focus)
  summary.append(map, copy, iconElement(ChevronDown))
  const body = createProgramBody(program)
  const bar = document.createElement('div')
  bar.className = 'workout-card-actions'
  const error = document.createElement('p')
  error.className = 'workout-action-error'
  error.setAttribute('role', 'status')
  const addAction = (key: string, label: string, icon: typeof Play, action: () => void | Promise<void>, primary = false): void => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `button workout-card-action workout-card-action--${key}${primary ? ' button--primary' : ' button--secondary'}`
    button.setAttribute('aria-label', `${label} ${program.name}`)
    button.append(iconElement(icon), document.createTextNode(label))
    button.addEventListener('click', () => {
      button.disabled = true
      error.textContent = ''
      void Promise.resolve().then(action).catch(reason => { error.textContent = readableApiError(reason) }).finally(() => { button.disabled = false })
    })
    bar.append(button)
  }
  if (actions.start) addAction('start', 'Start', Play, () => actions.start!(program), true)
  if (actions.edit) addAction('edit', 'Edit', Pencil, () => actions.edit!(program))
  if (actions.duplicate) addAction('duplicate', 'Duplicate', Copy, () => actions.duplicate!(program))
  if (actions.remove) addAction('delete', 'Delete', Trash2, () => actions.remove!(program))

  body.append(bar, error)
  card.append(summary, body)
  card.addEventListener('toggle', () => { summary.setAttribute('aria-label', `${card.open ? 'Collapse' : 'Expand'} ${program.name}`) })
  return card
}
