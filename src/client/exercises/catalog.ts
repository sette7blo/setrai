import type { Exercise } from './types.js'
import { createExerciseDetailView } from './detail-view.js'

export interface CatalogEntry {
  exercise: Exercise
  eventId: string
  address: string
  localId: number | null
  updateAvailable?: boolean
}

export interface ExerciseCatalog {
  load: (refresh?: boolean) => Promise<CatalogEntry[]>
  save: (eventId: string, update?: boolean, replaceImage?: boolean) => Promise<Exercise>
}

export function mergeExerciseCatalog(local: Exercise[], catalog: CatalogEntry[]): Exercise[] {
  const savedIds = new Set(local.map(item => item.id))
  const remote = catalog.filter(item => item.localId === null || !savedIds.has(item.localId))
    .map((item, index) => ({ ...item.exercise, id: -(index + 1), favourite: false }))
  return [...local, ...remote]
}

export function catalogEntry(exercise: Exercise, entries: CatalogEntry[], local: Exercise[]): CatalogEntry | undefined {
  if (exercise.id > 0) return entries.find(item => item.localId === exercise.id)
  const savedIds = new Set(local.map(item => item.id))
  return entries.filter(item => item.localId === null || !savedIds.has(item.localId))[-exercise.id - 1]
}

export function exerciseStatus(exercise: Exercise, entry?: CatalogEntry): 'Local' | 'Update' | 'Web' {
  return exercise.id < 0 ? 'Web' : entry?.updateAvailable ? 'Update' : 'Local'
}

export function statusLabel(status: 'Local' | 'Update' | 'Web', onUpdate?: () => void, disabled = false): HTMLElement {
  const badge = document.createElement(status === 'Update' && onUpdate ? 'button' : 'span')
  badge.className = `exercise-status exercise-status--${status.toLowerCase()}`
  badge.textContent = status
  if (status === 'Update' && onUpdate) {
    const button = badge as HTMLButtonElement
    button.type = 'button'
    button.disabled = disabled
    button.addEventListener('click', onUpdate)
  }
  return badge
}

export function catalogDetail(entry: CatalogEntry, onSave: () => void, onBack: () => void, busy: boolean): HTMLElement {
  const view = createExerciseDetailView(entry.exercise, onSave, busy ? 'Saving…' : 'Add to library')
  view.querySelector<HTMLButtonElement>('.detail-favourite')!.disabled = busy
  const back = view.querySelector<HTMLAnchorElement>('.detail-back')!
  back.textContent = 'Back to exercises'
  back.addEventListener('click', event => { event.preventDefault(); onBack() })
  return view
}
