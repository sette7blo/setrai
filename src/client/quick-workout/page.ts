import { readableApiError } from '../shared/api/errors.js'
import { listExercises } from '../exercises/api.js'
import { uniqueMuscles } from '../exercises/filters.js'
import type { Exercise } from '../exercises/types.js'
import { generateQuickWorkout } from './api.js'
import { createQuickWorkoutForm, resetQuickWorkoutForm, type QuickWorkoutFormState } from './form.js'
import { quickWorkoutPreview } from './preview.js'
import { startAndNavigate } from './start.js'
import type { QuickWorkout } from './types.js'

interface PageState {
  exercises: Exercise[]
  controls: QuickWorkoutFormState
  workout: QuickWorkout | null
  form: HTMLElement | null
}

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'quick-page quick-page--loading'
  section.innerHTML = '<div></div><div></div><div></div>'
  return section
}

function errorView(message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'workouts-empty'
  section.innerHTML = `<p class="eyebrow">Quick Workout</p><h1>Unable to generate</h1><p>${message}</p><button class="button button--primary" type="button" data-retry>Try again</button>`
  return section
}

function hero(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'quick-hero'
  section.innerHTML = `
    <div>
      <p class="eyebrow">Quick Workout</p>
      <h1>Ready when you are</h1>
      <p class="hero-summary">Generate a deterministic workout from your recovery, available equipment, and training goal. No AI required.</p>
    </div>
  `
  return section
}

function renderLoaded(root: HTMLElement, state: PageState): void {
  const page = document.createElement('div')
  page.className = 'quick-page'
  const onGenerate = (controls: QuickWorkoutFormState) => {
    state.controls = controls
    void generateQuickWorkout(controls).then((workout) => {
      state.workout = workout
      renderLoaded(root, state)
    }).catch((error) => {
      const view = errorView(readableApiError(error))
      view.querySelector('[data-retry]')?.addEventListener('click', () => renderLoaded(root, state))
      root.replaceChildren(view)
    }).finally(() => {
      if (state.form) resetQuickWorkoutForm(state.form)
    })
  }
  state.form = createQuickWorkoutForm(uniqueMuscles(state.exercises), onGenerate)
  page.append(hero(), state.form)
  if (state.workout) {
    page.append(quickWorkoutPreview(
      state.workout,
      state.exercises,
      () => { void startAndNavigate(state.workout!) },
      () => onGenerate(state.controls),
      () => { state.workout = null; renderLoaded(root, state) }
    ))
  }
  root.replaceChildren(page)
}

export async function renderQuickWorkoutPage(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const exercises = await listExercises()
    renderLoaded(root, {
      exercises,
      controls: { durationMinutes: 30, targetMuscles: [] },
      workout: null,
      form: null
    })
  } catch (error) {
    const view = errorView(readableApiError(error))
    view.querySelector('[data-retry]')?.addEventListener('click', () => {
      void renderQuickWorkoutPage(root)
    })
    root.replaceChildren(view)
  }
}
