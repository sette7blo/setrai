import { Check, CheckSquare, Download, Trash2, X } from 'lucide'
import { iconElement } from '../app/navigation.js'
import type { Exercise } from './types.js'

export function selectionToggle(selecting: boolean, busy: boolean, onToggle: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = selecting
    ? 'page-toolbar-action filter-icon exercise-selection-toggle page-toolbar-action--active filter-icon--active'
    : 'page-toolbar-action filter-icon exercise-selection-toggle'
  button.setAttribute('aria-label', selecting ? 'Exit selection mode' : 'Select exercises')
  button.setAttribute('aria-pressed', String(selecting))
  button.disabled = busy
  button.append(iconElement(selecting ? Check : CheckSquare))
  button.addEventListener('click', onToggle)
  return button
}

export function selectionToolbar(state: { selectedIds: Set<number>, busy: boolean }, visible: Exercise[], onSelectAll: () => void, onDelete: () => void, onCancel: () => void, onImport: () => void): HTMLElement {
  const bar = document.createElement('section')
  bar.className = 'exercise-selection-bar'
  const selected = [...state.selectedIds]
  const localCount = selected.filter(id => id > 0).length
  const webCount = selected.length - localCount
  const text = document.createElement('strong')
  text.textContent = selected.length ? `${selected.length} selected` : 'Select exercises'
  const allVisible = visible.length > 0 && visible.every(exercise => state.selectedIds.has(exercise.id))
  const selectAll = document.createElement('button')
  selectAll.type = 'button'
  selectAll.className = 'button button--secondary'
  selectAll.textContent = allVisible ? 'Clear visible' : 'Select all visible'
  selectAll.disabled = visible.length === 0 || state.busy
  selectAll.addEventListener('click', onSelectAll)
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'button button--danger exercise-bulk-delete'
  remove.disabled = localCount === 0 || state.busy
  remove.append(iconElement(Trash2), document.createTextNode(`Delete local (${localCount})`))
  remove.addEventListener('click', onDelete)
  const add = document.createElement('button')
  add.type = 'button'
  add.className = 'button button--primary'
  add.disabled = webCount === 0 || state.busy
  add.append(iconElement(Download), document.createTextNode(`Add web (${webCount})`))
  add.addEventListener('click', onImport)
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'button button--secondary exercise-select-cancel'
  cancel.setAttribute('aria-label', 'Cancel selection')
  cancel.disabled = state.busy
  cancel.append(iconElement(X))
  cancel.addEventListener('click', onCancel)
  bar.append(text, selectAll, remove)
  if (webCount) bar.append(add)
  bar.append(cancel)
  return bar
}
