import { loadingRegion, pageEmpty, pageError, showLoadingAfterDelay, skeleton } from '../shared/page-states.js'
import { ApiError, readableApiError } from '../shared/api/errors.js'
import { getExercise, setExerciseFavourite } from './api.js'
import { createExerciseDetailView } from './detail-view.js'

function loadingView(): HTMLElement {
  return loadingRegion('Loading exercise', 'exercise-detail', skeleton({ aspect: '4 / 3' }), skeleton({ height: 420 }))
}

function notFoundView(): HTMLElement {
  return pageEmpty({
    eyebrow: 'Exercise',
    title: 'Exercise not found',
    description: 'This exercise may have been removed or the link is incorrect.',
    action: { label: 'Back to Exercises', href: '/library/exercises' },
    className: 'exercise-empty',
  })
}

function errorView(message: string): HTMLElement {
  return pageError({
    eyebrow: 'Exercise',
    title: 'Unable to load exercise',
    message,
    className: 'exercise-empty',
    action: { label: 'Back to Exercises', href: '/library/exercises', primary: false },
  })
}

export async function renderExerciseDetail(root: HTMLElement, id: number): Promise<void> {
  const loaded = showLoadingAfterDelay(root, loadingView)

  try {
    let exercise = await getExercise(id)
    loaded()
    const render = (): void => {
      const instructionsOpen = root.querySelector<HTMLDetailsElement>('.detail-instructions')?.open ?? true
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
    loaded()
    if (error instanceof ApiError && error.status === 404) {
      root.replaceChildren(notFoundView())
      return
    }

    root.replaceChildren(errorView(readableApiError(error)))
  }
}
