import { Shuffle, X, Zap } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { displayName } from '../exercises/format.js'
import { readableApiError } from '../shared/api/errors.js'
import { generateQuickWorkout } from './api.js'
import { prescriptionText } from './format.js'
import { removeRecoveryExercise, swapRecoveryExercise } from './recovery-plan.js'
import { startAndNavigate } from './start.js'
import type { QuickWorkout } from './types.js'

// Public composition entry point: generation and session creation stay in Quick Workout.
export function createRecoveryWorkoutPanel(equipment: string[] = []): HTMLElement {
  const panel = document.createElement('section')
  panel.className = 'recovery-quick-panel'
  panel.id = 'quick-workout'
  panel.setAttribute('aria-label', 'Quick Workout')
  const heading = document.createElement('div')
  heading.className = 'recovery-quick-heading'
  const icon = document.createElement('span')
  icon.className = 'program-browse-icon'; icon.append(iconElement(Zap))
  const copy = document.createElement('div')
  const title = document.createElement('h2'); title.textContent = 'Quick Workout'
  const help = document.createElement('p')
  help.textContent = equipment.length ? `Uses recovered or fresh muscles with ${equipment.map(displayName).join(', ')}. Swap or remove exercises before starting.` : 'Uses recovered or fresh muscles. Add equipment in Settings to tailor it further.'
  copy.append(title, help); heading.append(icon, copy)
  const duration = document.createElement('div')
  duration.className = 'recovery-quick-duration'
  duration.setAttribute('role', 'group'); duration.setAttribute('aria-label', 'Workout length')
  let minutes = 30
  let workout: QuickWorkout | null = null
  let busy = false
  for (const value of [20, 30, 45, 60]) {
    const button = document.createElement('button')
    button.type = 'button'; button.textContent = `${value} min`
    button.setAttribute('aria-pressed', String(value === minutes))
    button.addEventListener('click', () => {
      minutes = value
      for (const child of duration.querySelectorAll('button')) child.setAttribute('aria-pressed', String(child === button))
    })
    duration.append(button)
  }
  const status = document.createElement('p')
  status.className = 'recovery-quick-status'; status.setAttribute('role', 'status')
  const build = document.createElement('button')
  build.type = 'button'; build.className = 'button button--primary'; build.textContent = 'Build Quick Workout'
  const result = document.createElement('div'); result.className = 'recovery-quick-result'
  const setBusy = (value: boolean): void => {
    busy = value; build.disabled = value
    panel.setAttribute('aria-busy', String(value))
    for (const button of panel.querySelectorAll<HTMLButtonElement>('button')) button.disabled = value
  }
  const render = (): void => {
    result.replaceChildren()
    if (!workout?.exercises.length) return
    const summary = document.createElement('p'); summary.className = 'recovery-quick-summary'
    const groups = [...new Set(workout.exercises.map(item => displayName(item.muscleGroup ?? '')).filter(Boolean))]
    summary.textContent = `${workout.exercises.length} exercises · ~${workout.estimatedDurationMinutes} min · ${groups.join(', ')}`
    const list = document.createElement('div'); list.className = 'recovery-quick-list'
    workout.exercises.forEach((item, index) => {
      const row = document.createElement('article'); row.className = 'recovery-quick-row'
      const number = document.createElement('span'); number.className = 'recovery-quick-index'; number.textContent = String(index + 1).padStart(2, '0')
      const info = document.createElement('div'); info.className = 'recovery-quick-info'
      const name = document.createElement('h3'); name.textContent = item.exerciseName
      const meta = document.createElement('p'); meta.textContent = `${displayName(item.muscleGroup ?? '')} · ${prescriptionText(item)}`
      info.append(name, meta)
      const actions = document.createElement('div'); actions.className = 'recovery-quick-row-actions'
      if (workout!.pool?.[item.muscleGroup ?? '']?.length) {
        const swap = document.createElement('button')
        swap.type = 'button'; swap.className = 'recovery-quick-icon'; swap.setAttribute('aria-label', `Swap ${item.exerciseName}`)
        swap.append(iconElement(Shuffle))
        swap.addEventListener('click', () => {
          workout = swapRecoveryExercise(workout!, index); render()
          result.querySelectorAll<HTMLElement>('.recovery-quick-row')[index]?.querySelector<HTMLButtonElement>('button')?.focus()
        })
        actions.append(swap)
      }
      const remove = document.createElement('button')
      remove.type = 'button'; remove.className = 'recovery-quick-icon'; remove.setAttribute('aria-label', `Remove ${item.exerciseName}`)
      remove.append(iconElement(X))
      remove.addEventListener('click', () => {
        workout = removeRecoveryExercise(workout!, index); render()
        if (!workout.exercises.length) { status.textContent = 'All exercises removed. Build another workout when ready.'; build.focus() }
        else result.querySelector<HTMLButtonElement>('.recovery-quick-icon')?.focus()
      })
      actions.append(remove); row.append(number, info, actions); list.append(row)
    })
    const start = document.createElement('button')
    start.type = 'button'; start.className = 'button button--primary'; start.textContent = 'Start Workout'
    start.addEventListener('click', () => {
      if (busy || !workout?.exercises.length) return
      setBusy(true); status.textContent = 'Starting workout...'
      void startAndNavigate(workout).catch(error => { status.textContent = readableApiError(error); setBusy(false) })
    })
    result.append(summary, list, start)
  }
  build.addEventListener('click', () => {
    if (busy) return
    setBusy(true); status.textContent = 'Building from ready muscles...'
    void generateQuickWorkout({ durationMinutes: minutes }).then(plan => {
      workout = plan; render(); status.textContent = ''
    }).catch(error => { status.textContent = readableApiError(error) }).finally(() => { setBusy(false) })
  })
  panel.append(heading, duration, build, status, result)
  return panel
}
