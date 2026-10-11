import { ChevronLeft, ChevronDown, Star, Download, Layers, Repeat, Timer, Dumbbell, Tag, ListOrdered } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { displayName } from './format.js'
import { createExerciseImage } from './image.js'
import { createMuscleMap } from './muscle-map.js'
import type { Exercise } from './types.js'

function pills(values: string[]): HTMLElement {
  const row = document.createElement('div')
  row.className = 'detail-pills'
  values.filter(Boolean).forEach(value => {
    const pill = document.createElement('span')
    pill.textContent = displayName(value)
    row.append(pill)
  })
  return row
}

function metadataSection(title: string, values: string[], icon: typeof Dumbbell): HTMLElement {
  const section = document.createElement('section')
  section.className = 'detail-section'
  const heading = document.createElement('h2')
  heading.append(iconElement(icon), document.createTextNode(title))
  section.append(heading, pills(values))
  section.hidden = !values.length
  return section
}

export function createInstructions(exercise: Exercise): HTMLDetailsElement {
  const section = document.createElement('details')
  section.className = 'detail-section detail-instructions'
  const summary = document.createElement('summary')
  summary.append(iconElement(ListOrdered), document.createTextNode('Instructions'), iconElement(ChevronDown))
  const list = document.createElement('ol')
  exercise.instructions.filter(step => step.trim()).forEach(step => {
    const item = document.createElement('li')
    item.textContent = step
    list.append(item)
  })
  section.append(summary)
  if (list.children.length) section.append(list)
  else {
    const empty = document.createElement('p')
    empty.textContent = 'No instructions are available for this exercise yet.'
    section.append(empty)
  }
  return section
}

export function createExerciseDetailView(exercise: Exercise, onFavourite: () => void, actionLabel?: string): HTMLElement {
  const page = document.createElement('article')
  page.className = 'exercise-detail'
  const back = document.createElement('a')
  back.className = 'detail-back'
  back.href = '/exercises'
  back.append(iconElement(ChevronLeft), document.createTextNode('Exercise library'))
  const card = document.createElement('div')
  card.className = 'exercise-detail__content'
  const heading = document.createElement('h1')
  heading.textContent = exercise.name
  const badges = pills([exercise.difficulty, exercise.category])
  badges.classList.add('detail-badges')
  const description = document.createElement('p')
  description.className = 'detail-description'
  description.textContent = exercise.description
  description.hidden = !exercise.description || exercise.description.trim() === exercise.instructions.join(' ').trim()
  const prescription = document.createElement('div')
  prescription.className = 'detail-prescription'
  const stats: Array<[string, string, typeof Layers]> = [
    [String(exercise.defaultSets), 'Sets', Layers],
    [exercise.defaultReps, 'Reps', Repeat],
    [`${exercise.defaultRest}s`, 'Rest', Timer]
  ]
  stats.forEach(([value, label, icon]) => {
    const tile = document.createElement('div')
    const strong = document.createElement('strong')
    strong.textContent = value
    const caption = document.createElement('span')
    caption.textContent = label
    tile.append(iconElement(icon), strong, caption)
    prescription.append(tile)
  })
  const map = createMuscleMap(exercise)
  map.querySelector('h2')!.after(pills([...new Set([exercise.muscleGroup, ...exercise.muscles])]))
  const favourite = document.createElement('button')
  favourite.type = 'button'
  favourite.className = 'button button--secondary detail-favourite'
  if (!actionLabel) favourite.setAttribute('aria-pressed', String(exercise.favourite))
  favourite.append(iconElement(actionLabel ? Download : Star), document.createTextNode(actionLabel || (exercise.favourite ? 'Remove from favorites' : 'Add to favorites')))
  favourite.addEventListener('click', onFavourite)
  card.append(
    createExerciseImage(exercise.imageUrl, `${exercise.name} exercise image`, 'exercise-detail__image'),
    heading, badges, description, prescription, map,
    metadataSection('Equipment', exercise.equipment, Dumbbell),
    metadataSection('Tags', exercise.tags, Tag),
    createInstructions(exercise), favourite
  )
  page.append(back, card)
  return page
}
