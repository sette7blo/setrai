import type { Exercise } from '../exercises/types.js'
import { fallbackText, goalLabel } from './format.js'
import { quickExerciseRow } from './exercise-row.js'
import type { QuickWorkout } from './types.js'

export function quickWorkoutPreview(workout: QuickWorkout, exercises: Exercise[], onStart: () => void, onRegenerate: () => void, onCancel: () => void): HTMLElement {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const section = document.createElement('section')
  section.className = 'quick-preview'
  section.innerHTML = `
    <div class="section-heading section-heading--split">
      <div>
        <p class="eyebrow">Preview</p>
        <h2>${workout.name}</h2>
        <p>${workout.durationMinutes} min · ${goalLabel(workout.goal)}</p>
        <p class="muted-line">${fallbackText(workout.recoveryFallback)}</p>
      </div>
    </div>
  `
  const list = document.createElement('div')
  list.className = 'quick-preview__list'
  workout.exercises.forEach((item) => list.append(quickExerciseRow(item, byId.get(item.exerciseId))))
  const actions = document.createElement('div')
  actions.className = 'quick-preview__actions'
  const start = document.createElement('button')
  start.type = 'button'
  start.className = 'button button--primary'
  start.textContent = 'Start Workout'
  start.addEventListener('click', onStart)
  const regenerate = document.createElement('button')
  regenerate.type = 'button'
  regenerate.className = 'button button--secondary'
  regenerate.textContent = 'Regenerate'
  regenerate.addEventListener('click', onRegenerate)
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'button button--secondary'
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', onCancel)
  actions.append(start, regenerate, cancel)
  section.append(list, actions)
  return section
}
