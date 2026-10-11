import { createExerciseImage } from '../exercises/image.js'
import { displayName } from '../exercises/format.js'
import { Check, Download } from 'lucide'
import { iconElement } from '../app/navigation.js'
import type { DiscoveredExercise } from './api.js'

export function discoverCard(item: DiscoveredExercise, onOpen: () => void, onImport: () => void, options: { selectable?: boolean, selected?: boolean, onSelect?: () => void } = {}): HTMLElement {
  const card = document.createElement('article')
  card.className = options.selected ? 'exercise-card discover-card exercise-card--selected' : 'exercise-card discover-card'
  if (options.selectable) card.dataset.selectable = 'true'
  const open = document.createElement('button')
  open.type = 'button'
  open.className = 'exercise-card__link discover-card__open'
  open.setAttribute('aria-label', options.selectable ? `${options.selected ? 'Deselect' : 'Select'} ${item.exercise.name}` : `Open ${item.exercise.name} details`)
  const body = document.createElement('div')
  body.className = 'exercise-card__body'
  const name = document.createElement('h2')
  name.textContent = item.exercise.name
  const meta = document.createElement('p')
  meta.className = 'exercise-card__muscle'
  meta.textContent = [item.exercise.muscleGroup, item.exercise.difficulty].filter(Boolean).map(displayName).join(' · ')
  body.append(name, meta)
  open.append(createExerciseImage(item.exercise.imageUrl, item.exercise.name), body)
  open.addEventListener('click', () => { if (options.selectable) options.onSelect?.(); else onOpen() })
  if (options.selectable) {
    const select = document.createElement('button')
    select.type = 'button'
    select.className = options.selected ? 'exercise-select-button exercise-select-button--active' : 'exercise-select-button'
    select.setAttribute('aria-label', `${options.selected ? 'Deselect' : 'Select'} ${item.exercise.name}`)
    select.setAttribute('aria-pressed', String(Boolean(options.selected)))
    select.append(iconElement(Check))
    select.addEventListener('click', (event) => { event.stopPropagation(); options.onSelect?.() })
    card.append(select)
  }
  const action = document.createElement('button')
  action.type = 'button'
  action.className = item.localId ? 'button button--secondary discover-card__import' : 'button button--primary discover-card__import'
  action.append(iconElement(item.localId ? Check : Download), document.createTextNode(item.localId ? 'In library' : 'Import'))
  action.disabled = item.localId !== null
  action.addEventListener('click', onImport)
  card.append(open, action)
  return card
}
