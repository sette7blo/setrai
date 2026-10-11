import { formatDate } from '../shared/formatting/date-format.js'
import type { WeightUnit } from '../profile/types.js'
import { displayWeightFromKg, formatBodyWeightFromKg } from '../profile/weight-units.js'
import type { BodyWeightPoint } from './types.js'

export function bodyWeightChart(points: BodyWeightPoint[], unit: WeightUnit): HTMLElement {
  const section = document.createElement('section')
  section.className = 'stats-panel'
  section.innerHTML = '<h2>Body-weight trend</h2>'
  if (points.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'muted-line'
    empty.textContent = 'Log body weight to see a trend here.'
    section.append(empty)
    return section
  }
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date)).slice(-12)
  const values = sorted.map((point) => displayWeightFromKg(point.weightKg, unit))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const list = document.createElement('div')
  list.className = 'weight-trend'
  list.setAttribute('role', 'img')
  list.setAttribute('aria-label', 'Body-weight trend')
  sorted.forEach((point, index) => {
    const item = document.createElement('div')
    const value = values[index]
    item.innerHTML = `<i style="height:${30 + ((value - min) / range) * 70}%"></i><span>${formatBodyWeightFromKg(point.weightKg, unit)}</span><small>${formatDate(point.date)}</small>`
    list.append(item)
  })
  section.append(list)
  return section
}
