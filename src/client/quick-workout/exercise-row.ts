import type { Exercise } from '../exercises/types.js'
import { createExerciseImage } from '../exercises/image.js'
import { displayName } from '../exercises/format.js'
import { prescriptionText } from './format.js'
import type { QuickWorkoutExercise } from './types.js'

export function quickExerciseRow(item: QuickWorkoutExercise, exercise?: Exercise): HTMLElement {
  const row = document.createElement('article')
  row.className = 'quick-exercise-row'
  row.append(createExerciseImage(exercise?.imageUrl ?? '', `${item.exerciseName} exercise image`, 'quick-exercise-row__image'))
  const body = document.createElement('div')
  body.innerHTML = `
    <span>${displayName(exercise?.muscleGroup ?? exercise?.muscles?.[0] ?? '')}</span>
    <h3>${item.exerciseName}</h3>
    <p>${prescriptionText(item)}</p>
  `
  row.append(body)
  return row
}
