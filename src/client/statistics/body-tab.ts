import { Activity, Check, Gauge, History, LineChart, Minus, Plus, Ruler, Target, Trash2, TrendingDown, TrendingUp, Weight } from 'lucide'

import { iconElement } from '../app/navigation.js'
import { pageSummary } from '../shared/page-chrome.js'
import { formatDate, todayDate } from '../shared/formatting/date-format.js'
import type { Profile, WeightUnit } from '../profile/types.js'
import { updateProfile } from '../profile/api.js'
import type { BodyWeightEntry } from '../profile/body-weight/types.js'
import { deleteBodyWeight, saveBodyWeight } from '../profile/body-weight/api.js'
import { newestFirst, oldestFirst } from '../profile/body-weight/format.js'
import { displayWeightFromKg, formatBodyWeightFromKg, inputWeightToKg } from '../profile/weight-units.js'
import type { StatisticsOverview } from './types.js'

export interface BodyTabContext {
  stats: StatisticsOverview
  profile: Profile
  entries: BodyWeightEntry[]
  onRefresh: () => void
}

type Icon = Parameters<typeof iconElement>[0]

function iconWrap(className: string, icon: Icon): HTMLElement {
  const span = document.createElement('span')
  span.className = className
  span.append(iconElement(icon))
  return span
}

function sectionHead(icon: Icon, title: string, note = ''): HTMLElement {
  const head = document.createElement('div')
  head.className = 'subsection-head stats-section-head'
  const name = document.createElement('span')
  name.className = 'stats-section-title'
  name.append(iconElement(icon), Object.assign(document.createElement('span'), { textContent: title }))
  head.append(name)
  if (note) head.append(Object.assign(document.createElement('small'), { textContent: note }))
  return head
}

function statsHero(unit: WeightUnit, entries: BodyWeightEntry[]): HTMLElement {
  const latest = newestFirst(entries)[0]
  const line = latest ? `Last logged ${shortDate(latest.date)}. Weights in ${unit}.` : `Track weight over time. Weights in ${unit}.`
  return pageSummary({
    icon: Weight,
    title: 'Body weight',
    description: line,
    className: 'stats-hero-card page-summary',
  })
}


function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function bodyCard(icon: Icon, value: string, label: string, tone = ''): HTMLElement {
  const tile = document.createElement('article')
  tile.className = `body-card${tone ? ` ${tone}` : ''}`
  tile.append(iconWrap('body-card-icon', icon))
  tile.append(
    Object.assign(document.createElement('div'), { className: 'body-card-val', textContent: value }),
    Object.assign(document.createElement('div'), { className: 'body-card-lbl', textContent: label })
  )
  return tile
}

function bodyCards(entries: BodyWeightEntry[], unit: WeightUnit): HTMLElement {
  const mount = document.createElement('div')
  mount.id = 'body-cards'
  if (entries.length === 0) return mount
  const cards = document.createElement('div')
  cards.className = 'body-cards'
  const sorted = oldestFirst(entries)
  const first = sorted[0]
  const latest = sorted[sorted.length - 1]
  const last7 = sorted.slice(-7)
  const avg7 = last7.reduce((sum, entry) => sum + entry.weightKg, 0) / last7.length
  const changeKg = latest.weightKg - first.weightKg
  const displayChange = displayWeightFromKg(changeKg, unit)
  cards.append(
    bodyCard(Weight, displayWeightFromKg(latest.weightKg, unit).toFixed(1), `Current (${unit})`),
    bodyCard(Activity, displayWeightFromKg(avg7, unit).toFixed(1), '7-day avg'),
    bodyCard(changeKg > 0 ? TrendingUp : changeKg < 0 ? TrendingDown : Minus, `${displayChange > 0 ? '+' : ''}${displayChange.toFixed(1)}`, 'Total change', changeKg > 0 ? 'up' : changeKg < 0 ? 'down' : '')
  )
  mount.append(cards)
  return mount
}

function bmiMarkup(entries: BodyWeightEntry[], heightCm?: number | null): HTMLElement {
  const wrap = document.createElement('div')
  wrap.id = 'body-bmi'
  if (!entries.length || !heightCm) return wrap
  const latest = oldestFirst(entries).at(-1)
  if (!latest) return wrap
  const meters = heightCm / 100
  const bmi = latest.weightKg / (meters * meters)
  const label = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
  wrap.append(sectionHead(Gauge, 'BMI', `${bmi.toFixed(1)} · ${label}`))
  const pct = Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100))
  const zones = [
    { cls: 'under', label: 'Under', min: 15, max: 18.5 },
    { cls: 'normal', label: 'Normal', min: 18.5, max: 25 },
    { cls: 'over', label: 'Over', min: 25, max: 30 },
    { cls: 'obese', label: 'Obese', min: 30, max: 40 }
  ]
  wrap.insertAdjacentHTML('beforeend', `<div class="bmi-bar">${zones.map((zone) => `<div class="bmi-zone ${zone.cls}" style="flex:0 0 ${(((zone.max - zone.min) / 25) * 100).toFixed(1)}%">${zone.label}</div>`).join('')}<div class="bmi-marker" style="left:${pct.toFixed(1)}%"></div></div><div class="bmi-scale"><span>15</span><span>18.5</span><span>25</span><span>30</span><span>40+</span></div>`)
  return wrap
}

function bodyChart(entries: BodyWeightEntry[], unit: WeightUnit): HTMLElement {
  const mount = document.createElement('div')
  mount.id = 'body-chart'
  if (entries.length < 2) {
    mount.className = 'body-chart-panel empty'
    mount.textContent = entries.length === 0 ? 'No body-weight entries yet.' : 'Log one more entry to see a trend.'
    return mount
  }
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
  mount.append(chart)
  return mount
}

function goalMarkup(entries: BodyWeightEntry[], targetWeightKg: number | null | undefined, unit: WeightUnit): HTMLElement {
  const wrap = document.createElement('div')
  wrap.id = 'body-goal'
  if (!entries.length || !targetWeightKg) return wrap
  const sorted = oldestFirst(entries)
  const first = sorted[0].weightKg
  const latest = sorted[sorted.length - 1].weightKg
  const totalNeeded = targetWeightKg - first
  const pct = totalNeeded === 0 ? 100 : Math.min(100, Math.max(0, ((latest - first) / totalNeeded) * 100))
  const remaining = targetWeightKg - latest
  wrap.append(sectionHead(Target, 'Goal progress', `${pct.toFixed(0)}%`))
  wrap.insertAdjacentHTML('beforeend', `<div class="body-goal-bar"><div class="body-goal-fill" style="width:${pct.toFixed(0)}%"></div></div><div class="body-goal-labels"><span>${formatBodyWeightFromKg(first, unit)}</span><span>${displayWeightFromKg(remaining, unit) > 0 ? '+' : ''}${displayWeightFromKg(remaining, unit).toFixed(1)} ${unit} to go</span><span>${formatBodyWeightFromKg(targetWeightKg, unit)}</span></div>`)
  return wrap
}

function entriesList(entries: BodyWeightEntry[], unit: WeightUnit, onRefresh: () => void): HTMLElement {
  const list = document.createElement('div')
  list.id = 'body-list'
  list.className = 'list body-entries'
  for (const entry of newestFirst(entries).slice(0, 10)) {
    const row = document.createElement('article')
    row.className = 'row body-entry'
    row.append(iconWrap('body-entry-icon', Weight))
    const copy = document.createElement('div')
    copy.innerHTML = `<strong>${formatBodyWeightFromKg(entry.weightKg, unit)}</strong><small>${formatDate(entry.date)}${entry.notes ? ` · ${entry.notes}` : ''}</small>`
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'button quiet danger small body-entry-delete'
    remove.setAttribute('aria-label', `Delete ${formatBodyWeightFromKg(entry.weightKg, unit)} on ${entry.date}`)
    remove.append(iconElement(Trash2))
    remove.addEventListener('click', () => {
      if (window.confirm(`Delete body-weight entry for ${entry.date}?`)) {
        void deleteBodyWeight(entry.id).then(onRefresh)
      }
    })
    row.append(copy, remove)
    list.append(row)
  }
  return list
}

function bodyForms(profile: Profile, entries: BodyWeightEntry[], onRefresh: () => void): HTMLElement {
  const unit = profile.weightUnit
  const panel = document.createElement('section')
  panel.className = 'panel stats-panel body-forms'
  const latest = newestFirst(entries)[0]
  panel.append(sectionHead(Plus, 'Log weight'))
  const form = document.createElement('form')
  form.id = 'body-form'
  form.className = 'form-grid'
  form.innerHTML = `<label>Date<input class="body-date-input" type="text" name="date" value="${todayDate()}" inputmode="numeric" autocomplete="off" placeholder="YYYY-MM-DD" pattern="\\d{4}-\\d{2}-\\d{2}" required /></label><label><span>Weight (<span class="body-unit-lbl">${unit}</span>)</span><input type="number" name="weight" step="0.1" min="1" inputmode="decimal" placeholder="e.g. 170" value="${latest ? displayWeightFromKg(latest.weightKg, unit) : ''}" required /></label><div class="form-actions span-2"><button class="button button--primary stats-action" type="submit"></button></div>`
  const save = form.querySelector('button')
  save?.append(iconElement(Plus), Object.assign(document.createElement('span'), { textContent: 'Log weight' }))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    void saveBodyWeight({ date: String(data.get('date')), weightKg: inputWeightToKg(Number(data.get('weight')), unit), notes: '' }).then(onRefresh)
  })
  panel.append(form, sectionHead(Ruler, 'Body metrics', 'for BMI & goal'))
  const profileForm = document.createElement('form')
  profileForm.id = 'body-profile-form'
  profileForm.className = 'form-grid'
  profileForm.innerHTML = `<label>Height (cm)<input type="number" name="heightCm" step="1" min="100" max="250" inputmode="numeric" placeholder="e.g. 175" value="${profile.heightCm ?? ''}" /></label><label><span>Target weight (<span class="body-unit-lbl">${unit}</span>)</span><input type="number" name="targetWeight" step="0.1" min="0" inputmode="decimal" placeholder="e.g. 165" value="${profile.targetWeightKg ? displayWeightFromKg(profile.targetWeightKg, unit) : ''}" /></label><div class="form-actions span-2"><button class="button stats-action" type="submit"></button></div>`
  profileForm.querySelector('button')?.append(iconElement(Check), Object.assign(document.createElement('span'), { textContent: 'Save metrics' }))
  profileForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(profileForm)
    const height = Number(data.get('heightCm'))
    const target = Number(data.get('targetWeight'))
    void updateProfile({ heightCm: height > 0 ? height : null, targetWeightKg: target > 0 ? inputWeightToKg(target, unit) : null }).then(onRefresh)
  })
  panel.append(profileForm)
  return panel
}

export function bodyView(context: BodyTabContext): HTMLElement {
  const { profile, entries, onRefresh } = context
  const unit = profile.weightUnit
  const section = document.createElement('section')
  section.className = 'stats-body-view'
  section.dataset.statsSection = 'body'
  section.append(statsHero(unit, entries), bodyCards(entries, unit))
  const panel = document.createElement('section')
  panel.className = 'panel stats-panel body-panel'
  if (entries.length === 0) {
    panel.innerHTML = `<div id="body-empty" class="empty stats-empty">No entries yet. Log your weight below to start tracking.</div>`
  }
  panel.append(
    bmiMarkup(entries, profile.heightCm),
    entries.length > 1 ? sectionHead(LineChart, 'Weight trend', `${Math.min(entries.length, 12)} entr${entries.length === 1 ? 'y' : 'ies'}`) : document.createTextNode(''),
    bodyChart(entries, unit),
    goalMarkup(entries, profile.targetWeightKg, unit),
    entries.length ? sectionHead(History, 'Entries', 'newest first') : document.createTextNode(''),
    entriesList(entries, unit, onRefresh)
  )
  section.append(panel, bodyForms(profile, entries, onRefresh))
  return section
}
