import { displayWeightFromKg, inputWeightToKg } from '../profile/weight-units.js'
import { deleteSessionSet, updateSessionSet } from './api.js'
import { action, node, numberInput } from './live-components.js'
import type { LiveModel } from './live-model.js'

export function editLoggedSet(model: LiveModel, id: number, rerender: () => void): void {
  const set = model.session.sets.find((entry) => entry.id === id)
  if (!set) return
  const dialog = node('dialog', 'live-edit-dialog')
  const form = node('form', '')
  form.append(node('h2', '', `Edit set ${set.setNumber}`))
  let value = String(set.durationSec ?? set.reps)
  let load = set.weight == null ? '' : String(displayWeightFromKg(set.weight, model.unit))
  const reps = node('label', '')
  reps.append(node('span', '', set.durationSec ? 'Seconds held' : 'Actual reps'), numberInput(set.durationSec ? 'Seconds held' : 'Actual reps', value, 'reps', (input) => { value = input }))
  const weight = node('label', '')
  weight.append(node('span', '', `Load ${model.unit}`), numberInput(`Load ${model.unit}`, load, 'weight', (input) => { load = input }))
  const error = node('p', 'live-error')
  error.hidden = true
  const controls = node('div', 'live-edit-actions')
  const close = () => { dialog.close(); dialog.remove() }
  const save = node('button', 'live-action live-primary', 'Save set')
  save.type = 'submit'
  controls.append(action('Cancel', close), save)
  form.append(reps, weight, error, controls)
  let busy = false
  async function mutate(work: () => Promise<void>) {
    if (busy) return
    busy = true
    for (const button of form.querySelectorAll('button')) button.disabled = true
    try { await work(); close(); rerender() } catch (failure) {
      error.textContent = failure instanceof Error ? failure.message : 'Unable to update this set.'
      error.hidden = false
    } finally { busy = false; for (const button of form.querySelectorAll('button')) button.disabled = false }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const amount = Number(value)
    const weightKg = load.trim() ? inputWeightToKg(Number(load), model.unit) : null
    if (!Number.isInteger(amount) || amount < 1 || (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0))) {
      error.textContent = 'Enter a positive whole number and a valid load.'
      error.hidden = false
      return
    }
    void mutate(async () => {
      const updated = await updateSessionSet(model.session.id, id, { ...(set.durationSec ? { durationSec: amount } : { reps: amount }), weight: weightKg })
      Object.assign(set, updated)
    })
  })
  form.append(action('Delete set', () => { void mutate(async () => {
    await deleteSessionSet(model.session.id, id)
    model.session.sets = model.session.sets.filter((entry) => entry.id !== id)
  }) }, 'live-delete'))
  dialog.addEventListener('close', () => dialog.remove())
  dialog.append(form)
  document.body.append(dialog)
  dialog.showModal()
}
