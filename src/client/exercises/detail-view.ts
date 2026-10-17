import { ChevronLeft, ChevronDown, Star, Dumbbell, ListOrdered, Pencil } from 'lucide'
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

function iconChromeButton(label: string, pressed?: boolean): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'detail-chrome-btn'
  button.setAttribute('aria-label', label)
  if (pressed !== undefined) button.setAttribute('aria-pressed', String(pressed))
  return button
}

export function createExerciseDetailView(exercise: Exercise, onFavourite: () => void): HTMLElement {
  const page = document.createElement('article')
  page.className = 'exercise-detail'
  const back = document.createElement('a')
  back.className = 'detail-back'
  back.href = '/exercises'
  back.append(iconElement(ChevronLeft), document.createTextNode('Exercises'))

  const card = document.createElement('div')
  card.className = 'exercise-detail__content'

  const media = document.createElement('div')
  media.className = 'exercise-detail__hero'
  media.append(createExerciseImage(exercise.imageUrl, `${exercise.name} exercise image`, 'exercise-detail__image'))

  const titleRow = document.createElement('div')
  titleRow.className = 'detail-title-row'
  const heading = document.createElement('h1')
  heading.textContent = exercise.name
  const chrome = document.createElement('div')
  chrome.className = 'detail-chrome'
  titleRow.append(heading, chrome)

  const favourite = iconChromeButton(
    exercise.favourite ? `Remove ${exercise.name} from favorites` : `Add ${exercise.name} to favorites`,
    exercise.favourite
  )
  favourite.classList.add('detail-chrome-btn--favourite')
  if (exercise.favourite) favourite.classList.add('detail-chrome-btn--active')
  favourite.append(iconElement(Star))
  favourite.addEventListener('click', onFavourite)
  chrome.append(favourite)

  if (exercise.id > 0) {
    const edit = document.createElement('a')
    edit.className = 'detail-chrome-btn detail-chrome-btn--edit'
    edit.href = `/exercises/${exercise.id}/edit`
    edit.setAttribute('aria-label', `Edit ${exercise.name}`)
    edit.title = 'Edit exercise'
    edit.append(iconElement(Pencil))
    chrome.append(edit)
  }

  const badges = pills([exercise.difficulty, exercise.category, exercise.movementType])
  badges.classList.add('detail-badges')
  const description = document.createElement('p')
  description.className = 'detail-description'
  description.textContent = exercise.description
  description.hidden = !exercise.description || exercise.description.trim() === exercise.instructions.join(' ').trim()

  const map = createMuscleMap(exercise)
  map.querySelector('h2')!.after(pills([...new Set([exercise.muscleGroup, ...exercise.muscles])]))

  card.append(
    media,
    titleRow,
    badges,
    description,
    map,
    metadataSection('Equipment', exercise.equipment, Dumbbell),
    createInstructions(exercise)
  )

  page.append(back, card)
  return page
}
