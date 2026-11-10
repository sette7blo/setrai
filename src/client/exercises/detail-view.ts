import { ChevronLeft, ChevronDown, Star, Pencil } from 'lucide'
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

// "Beginner, strength, compound, bodyweight": one sentence in place of rows of pills.
export function exerciseMetaLine(exercise: Pick<Exercise, 'difficulty' | 'category' | 'movementType' | 'equipment'>): string {
  const parts = [exercise.difficulty, exercise.category, exercise.movementType, ...exercise.equipment].filter(Boolean).map(value => displayName(value).toLowerCase())
  const line = [...new Set(parts)].join(', ')
  return line.charAt(0).toUpperCase() + line.slice(1)
}

export function createInstructions(exercise: Exercise): HTMLDetailsElement {
  const section = document.createElement('details')
  section.className = 'detail-section detail-instructions'
  section.open = true
  const summary = document.createElement('summary')
  summary.append(document.createTextNode('Instructions'), iconElement(ChevronDown))
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
  back.href = '/library/exercises'
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

  const meta = document.createElement('p')
  meta.className = 'detail-meta'
  meta.textContent = exerciseMetaLine(exercise)
  meta.hidden = !meta.textContent
  const description = document.createElement('p')
  description.className = 'detail-description'
  description.textContent = exercise.description
  description.hidden = !exercise.description || exercise.description.trim() === exercise.instructions.join(' ').trim()

  const map = createMuscleMap(exercise)
  map.querySelector('h2')!.after(pills([...new Set([exercise.muscleGroup, ...exercise.muscles])]))

  card.append(titleRow, meta, description, createInstructions(exercise), map)

  page.append(back, media, card)
  return page
}
