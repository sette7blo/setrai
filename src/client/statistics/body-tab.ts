import { Trash2 } from 'lucide'

import { iconElement } from '../app/navigation.js'
import { formatDate, todayDate } from '../shared/formatting/date-format.js'
import { statStrip } from '../shared/stat-strip.js'
import type { Profile, WeightUnit } from '../profile/types.js'
import { updateProfile } from '../profile/api.js'
import type { BodyWeightEntry } from '../profile/body-weight/types.js'
import { deleteBodyWeight, saveBodyWeight } from '../profile/body-weight/api.js'
import { newestFirst, oldestFirst } from '../profile/body-weight/format.js'
import { displayWeightFromKg, formatBodyWeightFromKg, inputWeightToKg } from '../profile/weight-units.js'
import type { StatisticsOverview } from './types.js'
import { createBodyShareExperience } from './body-share.js'
import { stackCardNote, statsCard } from './card.js'

export interface BodyTabContext {
  stats: StatisticsOverview
  profile: Profile
  entries: BodyWeightEntry[]
  onRefresh: () => void
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function bodyCards(entries: BodyWeightEntry[], changeKg: number, unit: WeightUnit): HTMLElement {
  const mount = document.createElement('div')
  mount.id = 'body-cards'
  if (entries.length === 0) return mount
  const sorted = oldestFirst(entries)
  const latest = sorted[sorted.length - 1]
  const last7 = sorted.slice(-7)
  const avg7 = last7.reduce((sum, entry) => sum + entry.weightKg, 0) / last7.length
  const displayChange = displayWeightFromKg(changeKg, unit)
  mount.append(statStrip([
    { value: displayWeightFromKg(latest.weightKg, unit).toFixed(1), label: `Current (${unit})` },
    { value: displayWeightFromKg(avg7, unit).toFixed(1), label: '7-day avg' },
    { value: `${displayChange > 0 ? '+' : ''}${displayChange.toFixed(1)}`, label: 'Total change' },
  ]))
  return mount
}

function bmiCard(entries: BodyWeightEntry[], heightCm?: number | null): HTMLElement | null {
  const latest = oldestFirst(entries).at(-1)
  if (!latest || !heightCm) return null
  const meters = heightCm / 100
  const bmi = latest.weightKg / (meters * meters)
  const label = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
  const { card } = statsCard('BMI', `${bmi.toFixed(1)}, ${label.toLowerCase()}`)
  card.id = 'body-bmi'
  const pct = Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100))
  const zones = [
    { cls: 'under', label: 'Under', min: 15, max: 18.5 },
    { cls: 'normal', label: 'Normal', min: 18.5, max: 25 },
    { cls: 'over', label: 'Over', min: 25, max: 30 },
    { cls: 'obese', label: 'Obese', min: 30, max: 40 }
  ]
  card.insertAdjacentHTML('beforeend', `<div><div class="bmi-bar">${zones.map((zone) => `<div class="bmi-zone ${zone.cls}" style="flex:0 0 ${(((zone.max - zone.min) / 25) * 100).toFixed(1)}%">${zone.label}</div>`).join('')}<div class="bmi-marker" style="left:${pct.toFixed(1)}%"></div></div><div class="bmi-scale"><span style="left:0">15</span><span style="left:14%">18.5</span><span style="left:40%">25</span><span style="left:60%">30</span><span style="left:100%">40+</span></div></div>`)
  return card
}

function trendCard(entries: BodyWeightEntry[], profile: Profile): { card: HTMLElement, dialog: HTMLDialogElement | null } {
  const unit = profile.weightUnit
  const { card, head } = statsCard('Weight trend', entries.length > 1 ? `Last ${Math.min(entries.length, 12)} entries` : '')
  card.id = 'body-chart'
  if (entries.length < 2) {
    card.append(Object.assign(document.createElement('p'), { className: 'stats-card-empty', textContent: entries.length === 0 ? 'No entries yet. Log your weight above to start tracking.' : 'Log one more entry to see a trend.' }))
    return { card, dialog: null }
  }
  const share = createBodyShareExperience(entries, profile)
  stackCardNote(head)
  head.append(share.button)
  const chart = document.createElement('div')
  chart.className = 'body-chart'
  const sorted = oldestFirst(entries).slice(-12)
  const values = sorted.map((entry) => displayWeightFromKg(entry.weightKg, unit))
  const min = Math.min(...values) * .995
  const max = Math.max(...values) * 1.005
  const range = max - min || 1
  const width = 400
  const height = 120
  const pad = 30
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2)
    const y = pad / 2 + (1 - (value - min) / range) * (height - pad)
    return [x.toFixed(1), y.toFixed(1)]
  })
  const polyline = points.map((point) => point.join(',')).join(' ')
  const areaPath = `M${points[0].join(',')} ${points.slice(1).map((point) => `L${point.join(',')}`).join(' ')} L${points[points.length - 1][0]},${height - pad / 2} L${points[0][0]},${height - pad / 2} Z`
  let yLabels = ''
  const steps = 4
  for (let index = 0; index <= steps; index += 1) {
    const value = min + (range * index / steps)
    const y = pad / 2 + (1 - index / steps) * (height - pad)
    yLabels += `<text x="${pad - 6}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle">${value.toFixed(0)}</text>`
    yLabels += `<line x1="${pad}" y1="${y.toFixed(1)}" x2="${width - pad}" y2="${y.toFixed(1)}" />`
  }
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height + 16}" role="img" aria-label="Body-weight trend">${yLabels}<path class="body-chart-area" d="${areaPath}"/><polyline points="${polyline}" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${points.map(([x, y], index) => `<circle cx="${x}" cy="${y}" r="3"><title>${shortDate(sorted[index].date)}: ${formatBodyWeightFromKg(sorted[index].weightKg, unit)}</title></circle>`).join('')}<text class="body-chart-date" x="${pad}" y="${height + 10}">${shortDate(sorted[0].date)}</text><text class="body-chart-date" x="${width - pad}" y="${height + 10}" text-anchor="end">${shortDate(sorted[sorted.length - 1].date)}</text></svg>`
  card.append(chart)
  return { card, dialog: share.dialog }
}

function goalCard(entries: BodyWeightEntry[], targetWeightKg: number | null | undefined, unit: WeightUnit): HTMLElement | null {
  if (!entries.length || !targetWeightKg) return null
  const sorted = oldestFirst(entries)
  const first = sorted[0].weightKg
  const latest = sorted[sorted.length - 1].weightKg
  const totalNeeded = targetWeightKg - first
  const pct = totalNeeded === 0 ? 100 : Math.min(100, Math.max(0, ((latest - first) / totalNeeded) * 100))
  const remaining = displayWeightFromKg(targetWeightKg - latest, unit)
  const { card } = statsCard('Goal progress', `${pct.toFixed(0)}%`)
  card.id = 'body-goal'
  card.insertAdjacentHTML('beforeend', `<div><div class="body-goal-bar"><div class="body-goal-fill" style="width:${pct.toFixed(0)}%"></div></div><div class="body-goal-labels"><span>${formatBodyWeightFromKg(first, unit)}</span><span>${remaining > 0 ? '+' : ''}${remaining.toFixed(1)} ${unit} to go</span><span>${formatBodyWeightFromKg(targetWeightKg, unit)}</span></div></div>`)
  return card
}

const ENTRIES_SHOWN = 10

// Deleting takes two taps: the bin swaps the row's controls for Cancel and Delete.
function entryRow(entry: BodyWeightEntry, unit: WeightUnit, onRefresh: () => void): HTMLElement {
  const row = document.createElement('li')
  row.className = 'body-entry-row'
  const weight = Object.assign(document.createElement('strong'), { textContent: formatBodyWeightFromKg(entry.weightKg, unit) })
  const date = Object.assign(document.createElement('span'), { className: 'body-entry-date', textContent: `${formatDate(entry.date)}${entry.notes ? ` · ${entry.notes}` : ''}` })
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'button body-entry-delete'
  remove.setAttribute('aria-label', `Delete ${formatBodyWeightFromKg(entry.weightKg, unit)} on ${formatDate(entry.date)}`)
  remove.append(iconElement(Trash2))
  const confirm = document.createElement('span')
  confirm.className = 'body-entry-confirm'
  confirm.hidden = true
  const cancel = Object.assign(document.createElement('button'), { type: 'button', className: 'button', textContent: 'Cancel' })
  const yes = Object.assign(document.createElement('button'), { type: 'button', className: 'button body-entry-confirm-delete', textContent: 'Delete' })
  confirm.append(cancel, yes)
  const ask = (asking: boolean): void => {
    confirm.hidden = !asking
    remove.hidden = asking
    date.hidden = asking
    ;(asking ? cancel : remove).focus()
  }
  remove.addEventListener('click', () => ask(true))
  cancel.addEventListener('click', () => ask(false))
  yes.addEventListener('click', () => {
    yes.disabled = true
    void deleteBodyWeight(entry.id).then(onRefresh)
  })
  row.append(weight, date, remove, confirm)
  return row
}

function entriesCard(entries: BodyWeightEntry[], unit: WeightUnit, onRefresh: () => void): HTMLElement | null {
  if (!entries.length) return null
  const sorted = newestFirst(entries)
  const { card } = statsCard('Entries', 'Newest first')
  const list = document.createElement('ul')
  list.id = 'body-list'
  list.className = 'body-entry-list'
  const render = (count: number): void => { list.replaceChildren(...sorted.slice(0, count).map(entry => entryRow(entry, unit, onRefresh))) }
  render(ENTRIES_SHOWN)
  card.append(list)
  if (sorted.length > ENTRIES_SHOWN) {
    const more = Object.assign(document.createElement('button'), { type: 'button', className: 'button body-entry-more', textContent: `Show all ${sorted.length}` })
    more.addEventListener('click', () => { render(sorted.length); more.remove() })
    card.append(more)
  }
  return card
}

function logWeightForm(profile: Profile, entries: BodyWeightEntry[], onRefresh: () => void): HTMLElement {
  const unit = profile.weightUnit
  const latest = newestFirst(entries)[0]
  const form = document.createElement('form')
  form.id = 'body-form'
  form.className = 'stats-card body-log'
  form.innerHTML = `<label><span>Weight (${unit})</span><input type="number" name="weight" step="0.1" min="1" inputmode="decimal" placeholder="e.g. 170" value="${latest ? displayWeightFromKg(latest.weightKg, unit) : ''}" required /></label><label><span>Date</span><input type="date" name="date" value="${todayDate()}" max="${todayDate()}" required /></label><button class="button button--primary" type="submit">Log weight</button>`
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    void saveBodyWeight({ date: String(data.get('date')), weightKg: inputWeightToKg(Number(data.get('weight')), unit), notes: '' }).then(onRefresh)
  })
  return form
}

function goalAndHeight(profile: Profile, onRefresh: () => void): HTMLElement {
  const unit = profile.weightUnit
  const details = document.createElement('details')
  details.className = 'stats-card body-settings'
  details.append(Object.assign(document.createElement('summary'), { textContent: 'Goal and height' }))
  const form = document.createElement('form')
  form.id = 'body-profile-form'
  form.className = 'body-log'
  form.innerHTML = `<label><span>Height (cm)</span><input type="number" name="heightCm" step="1" min="100" max="250" inputmode="numeric" placeholder="e.g. 175" value="${profile.heightCm ?? ''}" /></label><label><span>Target weight (${unit})</span><input type="number" name="targetWeight" step="0.1" min="0" inputmode="decimal" placeholder="e.g. 165" value="${profile.targetWeightKg ? displayWeightFromKg(profile.targetWeightKg, unit) : ''}" /></label><button class="button" type="submit">Save</button>`
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const height = Number(data.get('heightCm'))
    const target = Number(data.get('targetWeight'))
    void updateProfile({ heightCm: height > 0 ? height : null, targetWeightKg: target > 0 ? inputWeightToKg(target, unit) : null }).then(onRefresh)
  })
  details.append(form)
  return details
}

export function bodyView(context: BodyTabContext): HTMLElement {
  const { stats, profile, entries, onRefresh } = context
  const unit = profile.weightUnit
  const section = document.createElement('section')
  section.className = 'stats-body-view'
  section.dataset.statsSection = 'body'
  const trend = trendCard(entries, profile)
  const cards = [
    entries.length ? bodyCards(entries, stats.bodyWeightChangeKg ?? 0, unit) : null,
    logWeightForm(profile, entries, onRefresh),
    trend.card,
    goalCard(entries, profile.targetWeightKg, unit),
    bmiCard(entries, profile.heightCm),
    entriesCard(entries, unit, onRefresh),
    goalAndHeight(profile, onRefresh),
    trend.dialog,
  ]
  section.append(...cards.filter((card): card is HTMLElement => card !== null))
  return section
}
