import { pageEmpty, pageError, pageLoading } from '../shared/page-states.js'
import { ApiError, readableApiError } from '../shared/api/errors.js'
import { getExercise, setExerciseFavourite } from './api.js'
import { createExerciseDetailView } from './detail-view.js'

function loadingView(): HTMLElement {
  return pageLoading({ className: 'exercise-detail exercise-detail--loading', blocks: 2, label: 'Loading exercise' })
}

function notFoundView(): HTMLElement {
  return pageEmpty({
    eyebrow: 'Exercise',
    title: 'Exercise not found',
    description: 'This exercise may have been removed or the link is incorrect.',
    action: { label: 'Back to Exercises', href: '/exercises' },
    className: 'exercise-empty',
  })
}

function errorView(message: string): HTMLElement {
  return pageError({
    eyebrow: 'Exercise',
    title: 'Unable to load exercise',
    message,
    className: 'exercise-empty',
    action: { label: 'Back to Exercises', href: '/exercises', primary: false },
  })
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
