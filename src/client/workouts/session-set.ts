import type { SessionSet, UpdateSetInput } from './types.js'
import { formatWeight } from './format.js'

export function renderLoggedSet(
  set: SessionSet,
  onUpdate: (setId: number, input: UpdateSetInput) => void,
  onDelete: (setId: number) => void
): HTMLElement {
  const row = document.createElement('article')
  row.className = 'logged-set'

  const summary = document.createElement('div')
  summary.className = 'logged-set__summary'
  summary.innerHTML = `
    <strong>Set ${set.setNumber}</strong>
    <span>${formatWeight(set.weight)} × ${set.reps} ${set.done ? '✓' : 'open'}</span>
  `

  const form = document.createElement('form')
  form.className = 'logged-set__edit'

  const reps = document.createElement('input')
  reps.type = 'number'
  reps.min = '1'
  reps.inputMode = 'numeric'
  reps.value = String(set.reps)
  reps.setAttribute('aria-label', `Reps for set ${set.setNumber}`)

  const weight = document.createElement('input')
  weight.type = 'number'
  weight.min = '0'
  weight.step = '0.5'
  weight.inputMode = 'decimal'
  weight.value = set.weight === null ? '' : String(set.weight)
  weight.setAttribute('aria-label', `Weight for set ${set.setNumber}`)

  const save = document.createElement('button')
  save.type = 'submit'
  save.textContent = 'Save'

  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'button-danger'
  remove.textContent = 'Delete'
  remove.addEventListener('click', () => {
    if (window.confirm(`Delete set ${set.setNumber}?`)) {
      onDelete(set.id)
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    onUpdate(set.id, {
      reps: Number(reps.value),
      weight: weight.value ? Number(weight.value) : null,
      done: true
    })
  })

  form.append(reps, weight, save, remove)
  row.append(summary, form)
  return row
}
