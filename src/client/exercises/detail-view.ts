import { ChevronLeft, ChevronDown, Star, Download, Layers, Repeat, Timer, Dumbbell, Tag, ListOrdered, Pencil } from 'lucide'
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

export function createExerciseDetailView(exercise: Exercise, onFavourite: () => void, actionLabel?: string): HTMLElement {
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

  if (!actionLabel) {
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
  }

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

  card.append(
    media,
    titleRow,
    badges,
    description,
    prescription,
    map,
    metadataSection('Equipment', exercise.equipment, Dumbbell),
    metadataSection('Tags', exercise.tags, Tag),
    createInstructions(exercise)
  )

  // Catalog import keeps one full-width primary action at the bottom.
  if (actionLabel) {
    const primary = document.createElement('button')
    primary.type = 'button'
    primary.className = 'button button--primary detail-primary-action'
    primary.append(iconElement(Download), document.createTextNode(actionLabel))
    primary.addEventListener('click', onFavourite)
    card.append(primary)
  }

  page.append(back, card)
  return page
}
