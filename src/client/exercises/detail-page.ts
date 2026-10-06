import { ChevronLeft, Star } from 'lucide'
import { ApiError, readableApiError } from '../shared/api/errors.js'
import { iconElement } from '../app/navigation.js'
import { getExercise, setExerciseFavourite } from './api.js'
import { displayName, prescriptionText } from './format.js'
import { createExerciseImage } from './image.js'
import type { Exercise } from './types.js'

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'exercise-detail exercise-detail--loading'
  section.setAttribute('aria-busy', 'true')
  section.innerHTML = `
    <div class="exercise-detail__image"></div>
    <div class="exercise-detail__content"><span></span><span></span><span></span></div>
  `
  return section
}

function metadataTerm(term: string, value: string): HTMLElement {
  const item = document.createElement('div')
  const dt = document.createElement('dt')
  dt.textContent = term
  const dd = document.createElement('dd')
  dd.textContent = value || 'Not specified'
  item.append(dt, dd)
  return item
}

function favoriteButton(exercise: Exercise, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = exercise.favourite
    ? 'favorite-button favorite-button--active favorite-button--detail'
    : 'favorite-button favorite-button--detail'
  button.setAttribute(
    'aria-label',
    exercise.favourite ? `Remove ${exercise.name} from favorites` : `Add ${exercise.name} to favorites`
  )
  button.setAttribute('aria-pressed', String(exercise.favourite))
  button.append(iconElement(Star))
  button.addEventListener('click', onClick)
  return button
}

function instructionsList(exercise: Exercise): HTMLElement {
  const section = document.createElement('section')
  section.className = 'detail-section'

  const heading = document.createElement('h2')
  heading.textContent = 'Instructions'
  section.append(heading)

  if (exercise.instructions.length === 0) {
    const empty = document.createElement('p')
    empty.textContent = 'No instructions are available for this exercise yet.'
    section.append(empty)
    return section
  }

  const list = document.createElement('ol')
  for (const step of exercise.instructions) {
    const item = document.createElement('li')
    item.textContent = step
    list.append(item)
  }

  section.append(list)
  return section
}

function detailView(exercise: Exercise, onFavourite: () => void): HTMLElement {
  const page = document.createElement('article')
  page.className = 'exercise-detail'

  const back = document.createElement('a')
  back.className = 'detail-back'
  back.href = '/exercises'
  back.append(iconElement(ChevronLeft), document.createTextNode('Exercise library'))

  const media = document.createElement('div')
  media.className = 'exercise-detail__media'
  media.append(createExerciseImage(exercise.imageUrl, `${exercise.name} exercise image`, 'exercise-detail__image'))

  const content = document.createElement('div')
  content.className = 'exercise-detail__content'

  const titleRow = document.createElement('div')
  titleRow.className = 'detail-title-row'
  const title = document.createElement('div')
  const eyebrow = document.createElement('p')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Exercise detail'
  const heading = document.createElement('h1')
  heading.textContent = exercise.name
  title.append(eyebrow, heading)
  titleRow.append(title, favoriteButton(exercise, onFavourite))

  const description = document.createElement('p')
  description.className = 'hero-summary'
  description.textContent = exercise.description || 'A seeded Setrai movement ready for programming and training.'

  const prescription = document.createElement('section')
  prescription.className = 'prescription-panel'
  prescription.innerHTML = `
    <p>Default prescription</p>
    <strong>${prescriptionText(exercise)}</strong>
  `

  const metadata = document.createElement('dl')
  metadata.className = 'detail-metadata'
  metadata.append(
    metadataTerm('Primary', displayName(exercise.muscleGroup)),
    metadataTerm('Also works', exercise.muscles.filter((muscle) => muscle !== exercise.muscleGroup).map(displayName).join(' · ')),
    metadataTerm('Equipment', exercise.equipment.map(displayName).join(' · ')),
    metadataTerm('Difficulty', displayName(exercise.difficulty))
  )

  content.append(titleRow, description, prescription, metadata, instructionsList(exercise))
  page.append(back, media, content)
  return page
}

function notFoundView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'exercise-empty'
  section.innerHTML = `
    <p class="eyebrow">Exercise detail</p>
    <h1>Exercise not found</h1>
    <p>This exercise may have been removed or the link is incorrect.</p>
    <a class="button button--primary" href="/exercises">Back to Exercise library</a>
  `
  return section
}

function errorView(message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'exercise-empty'
  section.innerHTML = `
    <p class="eyebrow">Exercise detail</p>
    <h1>Unable to load exercise</h1>
    <p>${message}</p>
    <a class="button button--secondary" href="/exercises">Back to Exercise library</a>
  `
  return section
}

export async function renderExerciseDetail(root: HTMLElement, id: number): Promise<void> {
  root.replaceChildren(loadingView())

  try {
    let exercise = await getExercise(id)
    const render = (): void => {
      root.replaceChildren(detailView(exercise, () => {
        void setExerciseFavourite(exercise.id, !exercise.favourite).then((updated) => {
          exercise = updated
          render()
        })
      }))
    }
    render()
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      root.replaceChildren(notFoundView())
      return
    }

    root.replaceChildren(errorView(readableApiError(error)))
  }
}
