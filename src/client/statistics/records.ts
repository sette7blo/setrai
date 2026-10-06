import type { WeightUnit } from '../profile/types.js'
import { recordText } from './format.js'
import type { PersonalRecord } from './types.js'

export function recordsPanel(records: PersonalRecord[], unit: WeightUnit): HTMLElement {
  const section = document.createElement('section')
  section.className = 'stats-panel'
  section.innerHTML = '<h2>Personal records</h2>'
  if (records.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'muted-line'
    empty.textContent = 'Personal records appear after completed weighted sets.'
    section.append(empty)
    return section
  }
  const grid = document.createElement('div')
  grid.className = 'record-grid'
  for (const record of records.slice(0, 6)) {
    const card = document.createElement('article')
    card.className = 'record-card'
    card.innerHTML = `<h3>${record.exerciseName}</h3><dl><div><dt>Max weight</dt><dd>${recordText(record.maxWeight, unit)}</dd></div><div><dt>Estimated 1RM</dt><dd>${recordText(record.estimated1RM, unit)}</dd></div></dl>`
    grid.append(card)
  }
  section.append(grid)
  return section
}
