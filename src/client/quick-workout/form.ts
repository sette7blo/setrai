import { displayName } from '../exercises/format.js'
import { DURATION_CHOICES, requestSummary, validateDuration } from './format.js'

export interface QuickWorkoutFormState {
  durationMinutes: number
  targetMuscles: string[]
}

export function formInput(form: HTMLFormElement): QuickWorkoutFormState {
  const data = new FormData(form)
  const custom = Number(data.get('customDuration') || 0)
  const selected = Number(data.get('durationMinutes') || 30)
  return {
    durationMinutes: custom || selected,
    targetMuscles: data.getAll('targetMuscles').map(String)
  }
}

export function createQuickWorkoutForm(muscles: string[], onGenerate: (state: QuickWorkoutFormState) => void): HTMLElement {
  const form = document.createElement('form')
  form.className = 'quick-form'
  form.innerHTML = `
    <fieldset>
      <legend>Duration</legend>
      <div class="quick-choice-row">
        ${DURATION_CHOICES.map((minutes) => `
          <label class="quick-chip">
            <input type="radio" name="durationMinutes" value="${minutes}" ${minutes === 30 ? 'checked' : ''}>
            <span>${minutes} min</span>
          </label>
        `).join('')}
      </div>
    </fieldset>
    <label class="quick-custom">
      <span>Custom duration</span>
      <input name="customDuration" type="number" min="15" max="90" step="5" inputmode="numeric" placeholder="15–90 min">
    </label>
    <fieldset>
      <legend>Target muscles <span>Optional</span></legend>
      <div class="quick-choice-row quick-choice-row--wrap">
        ${muscles.map((muscle) => `
          <label class="quick-chip">
            <input type="checkbox" name="targetMuscles" value="${muscle}">
            <span>${displayName(muscle)}</span>
          </label>
        `).join('')}
      </div>
    </fieldset>
  `
  const help = document.createElement('p')
  help.className = 'muted-line'
  help.textContent = 'Generated from your recovery, equipment, and training goal.'
  const error = document.createElement('p')
  error.className = 'quick-form__error'
  error.setAttribute('role', 'status')
  const button = document.createElement('button')
  button.type = 'submit'
  button.className = 'button button--primary'
  button.textContent = 'Generate Workout'
  form.append(help, error, button)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const state = formInput(form)
    const message = validateDuration(state.durationMinutes)
    if (message) {
      error.textContent = message
      return
    }
    error.textContent = ''
    button.textContent = `Generating · ${requestSummary(state.durationMinutes, state.targetMuscles)}`
    button.setAttribute('aria-busy', 'true')
    button.disabled = true
    onGenerate(state)
  })
  return form
}

export function resetQuickWorkoutForm(form: HTMLElement): void {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (button) {
    button.disabled = false
    button.removeAttribute('aria-busy')
    button.textContent = 'Generate Workout'
  }
}
