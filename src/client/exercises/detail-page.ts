import { ApiError, readableApiError } from '../shared/api/errors.js'
import { getExercise, setExerciseFavourite } from './api.js'
import { createExerciseDetailView } from './detail-view.js'

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
      const instructionsOpen = root.querySelector<HTMLDetailsElement>('.detail-instructions')?.open ?? false
      root.replaceChildren(createExerciseDetailView(exercise, () => {
        void setExerciseFavourite(exercise.id, !exercise.favourite).then((updated) => {
          exercise = updated
          render()
        })
      }))
      root.querySelector<HTMLDetailsElement>('.detail-instructions')!.open = instructionsOpen
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
