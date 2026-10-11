import { Check, Star } from 'lucide'
import { iconElement } from '../app/navigation.js'
import type { Exercise } from './types.js'
import { displayName } from './format.js'
import { createExerciseImage } from './image.js'
import { statusLabel } from './catalog.js'

export function createExerciseCard(
  exercise: Exercise,
  onFavourite: (exercise: Exercise) => void,
  options: { selectable?: boolean, selected?: boolean, onSelect?: (exercise: Exercise) => void, status?: 'Local' | 'Update' | 'Web', onOpen?: () => void, onUpdate?: () => void, busy?: boolean } = {}
): HTMLElement {
  const article = document.createElement('article')
  article.className = options.selected ? 'exercise-card exercise-card--selected' : 'exercise-card'
  if (options.selectable) article.dataset.selectable = 'true'

  const link = document.createElement('a')
  link.className = 'exercise-card__link'
  link.href = `/exercises/${exercise.id}`
  link.setAttribute('aria-label', options.selectable ? `${options.selected ? 'Deselect' : 'Select'} ${exercise.name}` : `Open ${exercise.name} details`)
  if (options.onOpen && !options.selectable) link.addEventListener('click', event => { event.preventDefault(); options.onOpen?.() })
  if (options.selectable) {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      options.onSelect?.(exercise)
    })
  }
  link.append(createExerciseImage(exercise.imageUrl, `${exercise.name} exercise image`))

  const body = document.createElement('div')
  body.className = 'exercise-card__body'

  const heading = document.createElement('h2')
  heading.textContent = exercise.name

  const primary = document.createElement('p')
  primary.className = 'exercise-card__muscle'
  primary.textContent = exercise.muscleGroup || exercise.category
    ? displayName(exercise.muscleGroup || exercise.category) : 'Training movement'

  body.append(heading, primary)

  if (exercise.difficulty) {
    const level = document.createElement('small')
    level.className = 'exercise-card__level'
    level.dataset.difficulty = exercise.difficulty.trim().toLowerCase()
    level.textContent = displayName(exercise.difficulty)
    body.append(level)
  }

  link.append(body)

  const favourite = document.createElement('button')
  favourite.type = 'button'
  favourite.className = exercise.favourite
    ? 'favorite-button favorite-button--active'
    : 'favorite-button'
  favourite.setAttribute(
    'aria-label',
    exercise.favourite ? `Remove ${exercise.name} from favorites` : `Add ${exercise.name} to favorites`
  )
  favourite.setAttribute('aria-pressed', String(exercise.favourite))
  favourite.append(iconElement(Star))
  favourite.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    onFavourite(exercise)
  })

  if (options.status !== 'Web' && !options.selectable) body.append(favourite)
  article.append(link)
  if (options.status) article.append(statusLabel(options.status, options.onUpdate, options.busy || options.selectable))
  if (options.selectable) {
    const select = document.createElement('button')
    select.type = 'button'
    select.className = options.selected ? 'exercise-select-button exercise-select-button--active' : 'exercise-select-button'
    select.setAttribute('aria-label', options.selected ? `Deselect ${exercise.name}` : `Select ${exercise.name}`)
    select.setAttribute('aria-pressed', String(Boolean(options.selected)))
    select.append(iconElement(Check))
    select.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      options.onSelect?.(exercise)
    })
    const footer = document.createElement('div')
    footer.className = 'exercise-card__selection'
    footer.append(select)
    article.append(footer)
  }
  return article
}
