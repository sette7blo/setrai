import { X } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { createRecoveryWorkoutPanel } from './recovery-panel.js'

export function shouldOpenRecoveryWorkoutSheet(
  event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
  resume: boolean
): boolean {
  return !resume && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function openRecoveryWorkoutSheet(opener: HTMLElement | null = document.activeElement as HTMLElement | null): HTMLDialogElement {
  const current = document.querySelector<HTMLDialogElement>('.quick-workout-sheet')
  if (current) return current

  const dialog = document.createElement('dialog')
  dialog.className = 'quick-workout-sheet'
  dialog.setAttribute('aria-labelledby', 'quick-workout-sheet-title')
  let cleanedUp = false
  const cleanup = (): void => {
    if (cleanedUp) return
    cleanedUp = true
    dialog.remove()
    opener?.focus()
  }
  const dismiss = (): void => {
    if (dialog.open) dialog.close()
    cleanup()
  }

  const heading = document.createElement('header')
  heading.className = 'quick-workout-sheet__heading'
  const copy = document.createElement('div')
  const title = document.createElement('h2')
  title.id = 'quick-workout-sheet-title'
  title.textContent = 'Quick Workout'
  const summary = document.createElement('p')
  summary.textContent = 'Built from your recovery, training goal, and saved equipment.'
  copy.append(title, summary)

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'quick-workout-sheet__close'
  close.setAttribute('aria-label', 'Close Quick Workout')
  close.append(iconElement(X))
  close.addEventListener('click', dismiss)
  heading.append(copy, close)

  const content = document.createElement('div')
  content.className = 'quick-workout-sheet__content'
  content.append(createRecoveryWorkoutPanel([], { showHeading: false, id: 'quick-workout-sheet-panel' }))
  dialog.append(heading, content)

  dialog.addEventListener('click', event => {
    if (event.target !== dialog || !shouldOpenRecoveryWorkoutSheet(event, false)) return
    const rect = dialog.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      dismiss()
    }
  })
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss() })
  dialog.addEventListener('close', cleanup, { once: true })

  document.body.append(dialog)
  dialog.showModal()
  return dialog
}
