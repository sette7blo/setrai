import { Star } from 'lucide'
import { iconElement } from '../app/navigation.js'
import type { Exercise } from './types.js'
import { displayName } from './format.js'
import { createExerciseImage } from './image.js'

export function createExerciseCard(
  exercise: Exercise,
  onFavourite: (exercise: Exercise) => void
): HTMLElement {
  const article = document.createElement('article')
  article.className = 'exercise-card'

  const link = document.createElement('a')
  link.className = 'exercise-card__link'
  link.href = `/exercises/${exercise.id}`
  link.setAttribute('aria-label', `Open ${exercise.name} details`)
  link.append(createExerciseImage(exercise.imageUrl, `${exercise.name} exercise image`))

  const body = document.createElement('div')
  body.className = 'exercise-card__body'

  const heading = document.createElement('h2')
  heading.textContent = exercise.name

  const primary = document.createElement('p')
  primary.className = 'exercise-card__muscle'
  const muscleIcon = document.createElement('span')
  muscleIcon.className = 'exercise-card__muscle-icon'
  muscleIcon.textContent = '◖'
  primary.append(muscleIcon, document.createTextNode(exercise.muscleGroup ? displayName(exercise.muscleGroup) : 'Training movement'))

  body.append(heading, primary)

  if (exercise.equipment.length > 0) {
    const equipment = document.createElement('small')
    equipment.textContent = exercise.equipment.slice(0, 2).map(displayName).join(' · ')
    body.append(equipment)
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

  article.append(link, favourite)
  return article
}
