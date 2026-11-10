import { Check, Star } from 'lucide'
import { iconElement } from '../app/navigation.js'
import type { Exercise } from './types.js'
import { displayName } from './format.js'
import { createExerciseImage } from './image.js'

// One quiet line under the name: muscle group, then difficulty.
export function exerciseCardMeta(exercise: Pick<Exercise, 'muscleGroup' | 'category' | 'difficulty'>): string {
  const muscle = exercise.muscleGroup || exercise.category
  return [muscle ? displayName(muscle) : 'Training movement', exercise.difficulty ? displayName(exercise.difficulty) : ''].filter(Boolean).join(', ')
}

export function createExerciseCard(
  exercise: Exercise,
  onFavourite: (exercise: Exercise) => void,
  options: { selectable?: boolean, selected?: boolean, onSelect?: (exercise: Exercise) => void, busy?: boolean } = {}
): HTMLElement {
  const article = document.createElement('article')
  article.className = options.selected ? 'exercise-card exercise-card--selected' : 'exercise-card'
  if (options.selectable) article.dataset.selectable = 'true'

  const link = document.createElement('a')
  link.className = 'exercise-card__link'
  link.href = `/exercises/${exercise.id}`
  link.setAttribute('aria-label', options.selectable ? `${options.selected ? 'Deselect' : 'Select'} ${exercise.name}` : `Open ${exercise.name} details`)

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

  const meta = document.createElement('p')
  meta.className = 'exercise-card__meta'
  meta.textContent = exerciseCardMeta(exercise)

  body.append(heading, meta)

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

  if (!options.selectable) body.append(favourite)
  article.append(link)
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
