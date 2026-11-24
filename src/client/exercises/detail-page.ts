import { loadingRegion, pageEmpty, pageError, showLoadingAfterDelay, skeleton } from '../shared/page-states.js'
import { ApiError, readableApiError } from '../shared/api/errors.js'
import { getExercise, setExerciseFavourite } from './api.js'
import { createExerciseDetailView } from './detail-view.js'
import { createExerciseProgress } from './progress-view.js'
import { getExerciseProgress } from '../statistics/api.js'
import { getProfile } from '../profile/api.js'

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
    let progress: HTMLElement | null = null
    const render = (): void => {
      const instructionsOpen = root.querySelector<HTMLDetailsElement>('.detail-instructions')?.open ?? true
      root.replaceChildren(createExerciseDetailView(exercise, () => {
        void setExerciseFavourite(exercise.id, !exercise.favourite).then((updated) => {
          exercise = updated
          render()
        })
      }))
      root.querySelector<HTMLDetailsElement>('.detail-instructions')!.open = instructionsOpen
      root.querySelector<HTMLElement>('.exercise-detail')!.dataset.exerciseId = String(id)
      if (progress) root.querySelector('.detail-instructions')!.after(progress)
    }
    render()
    // Progress fills in after the page is shown; any failure leaves it out.
    void Promise.all([getExerciseProgress(exercise.slug), getProfile().catch(() => ({ weightUnit: 'kg' as const }))])
      .then(([data, profile]) => {
        progress = createExerciseProgress(data, profile.weightUnit)
        // Only if this exercise is still on screen (the user may have moved on).
        if (progress) root.querySelector(`.exercise-detail[data-exercise-id="${id}"] .detail-instructions`)?.after(progress)
      })
      .catch(() => {})
  } catch (error) {
    loaded()
    if (error instanceof ApiError && error.status === 404) {
      root.replaceChildren(notFoundView())
      return
    }

    root.replaceChildren(errorView(readableApiError(error)))
  }
}
