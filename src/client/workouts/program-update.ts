import { reviewCatalogProgram, updateCatalogProgram } from './discovery-api.js'
import { createProgramBody } from './program-preview.js'
import { displayName } from '../exercises/format.js'
import { readableApiError } from '../shared/api/errors.js'
import type { Program } from './types.js'

export async function openProgramUpdate(saved: Program, latest: Program, onSaved: () => Promise<void>): Promise<void> {
  const review = await reviewCatalogProgram(latest.nostrEventId!)
  const dialog = document.createElement('dialog')
  dialog.className = 'program-update-dialog'
  dialog.setAttribute('aria-label', `Review update for ${saved.name}`)
  const title = document.createElement('h2')
  title.textContent = `Update ${saved.name}`
  const help = document.createElement('p')
  help.textContent = review.legacy ? 'This workout predates update tracking. Its saved values will be kept; reviewing records the latest version.'
    : 'Changes to unedited fields will be applied. Your local edits will be kept.'
  const list = document.createElement('ul')
  for (const field of review.fields.filter(field => field.changed)) {
    const item = document.createElement('li')
    item.textContent = `${field.field === 'plan' ? 'Exercises and structure' : displayName(field.field)} · ${field.apply ? 'Will update' : 'Keep saved value'}`
    list.append(item)
  }
  const previews = document.createElement('div')
  previews.className = 'program-update-previews'
  for (const [label, program] of [['Your saved workout', saved], ['Latest relay version', latest]] as const) {
    const section = document.createElement('section')
    const heading = document.createElement('h3')
    heading.textContent = `${label} · ${program.name}`
    section.append(heading, createProgramBody(program))
    previews.append(section)
  }
  const footer = document.createElement('div')
  footer.className = 'program-update-actions'
  const cancel = document.createElement('button')
  cancel.type = 'button'; cancel.className = 'button button--secondary'; cancel.textContent = 'Cancel'
  cancel.addEventListener('click', () => dialog.close())
  const apply = document.createElement('button')
  apply.type = 'button'; apply.className = 'button button--primary'; apply.textContent = 'Apply update'
  const error = document.createElement('p')
  error.setAttribute('role', 'status')
  apply.addEventListener('click', () => {
    apply.disabled = true; cancel.disabled = true; error.textContent = ''
    void updateCatalogProgram(latest.nostrEventId!).then(onSaved).then(() => dialog.close()).catch(reason => {
      error.textContent = readableApiError(reason); apply.disabled = false; cancel.disabled = false
    })
  })
  footer.append(cancel, apply)
  const opener = document.activeElement as HTMLElement | null
  const programKey = opener?.closest<HTMLElement>('.workout-card')?.dataset.programKey
  dialog.addEventListener('close', () => {
    dialog.remove()
    if (opener?.isConnected) opener.focus()
    else Array.from(document.querySelectorAll<HTMLElement>('.workout-card')).find(card => card.dataset.programKey === programKey)
      ?.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true })
  })
  dialog.append(title, help, list, previews, error, footer)
  document.body.append(dialog)
  dialog.showModal()
}
