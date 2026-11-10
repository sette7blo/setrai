import { readableApiError } from '../shared/api/errors.js'
import { correctSessionDuration } from './api.js'
import type { Session } from './types.js'

const MAX_MINUTES = 600

// SQLite stores session clocks as "YYYY-MM-DD HH:MM:SS" in UTC.
export function finishedAtForDuration(startedAt: string, minutes: number): string {
  const started = new Date(startedAt.endsWith('Z') ? startedAt : `${startedAt.replace(' ', 'T')}Z`)
  return new Date(started.getTime() + minutes * 60_000).toISOString().slice(0, 19).replace('T', ' ')
}

/** Lets a session left running, or closed by accident, get its real length back. */
export function durationCorrection(session: Session, onSaved: (session: Session) => void): HTMLElement {
  const form = document.createElement('form')
  form.className = 'history-duration-fix'
  const label = document.createElement('label')
  const text = document.createElement('span')
  text.textContent = 'This duration looks off. How long was the workout?'
  const field = document.createElement('span')
  field.className = 'history-duration-field'
  const input = document.createElement('input')
  input.type = 'number'
  input.inputMode = 'numeric'
  input.min = '1'
  input.max = String(MAX_MINUTES)
  input.required = true
  input.placeholder = '45'
  input.setAttribute('aria-label', 'Workout length in minutes')
  field.append(input, document.createTextNode('min'))
  label.append(text, field)
  const save = document.createElement('button')
  save.type = 'submit'
  save.className = 'button button--primary'
  save.textContent = 'Save duration'
  const status = document.createElement('p')
  status.className = 'history-duration-status'
  status.setAttribute('role', 'status')
  form.append(label, save, status)
  form.addEventListener('submit', event => {
    event.preventDefault()
    const minutes = Math.round(Number(input.value))
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
      status.textContent = `Enter a length between 1 and ${MAX_MINUTES} minutes.`
      return
    }
    save.disabled = true
    status.textContent = 'Saving...'
    void correctSessionDuration(session.id, finishedAtForDuration(session.startedAt, minutes))
      .then(updated => { onSaved({ ...session, finishedAt: updated.finishedAt }) })
      .catch(error => { status.textContent = readableApiError(error); save.disabled = false })
  })
  return form
}
