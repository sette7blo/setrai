import type { WeightUnit } from '../profile/types.js'
import { weeklyChartSeries } from './format.js'
import type { WeeklyVolumePoint } from './types.js'

export function weeklyVolumeChart(points: WeeklyVolumePoint[], unit: WeightUnit): HTMLElement {
  const section = document.createElement('section')
  section.className = 'stats-panel'
  section.innerHTML = '<h2>Weekly volume</h2>'
  const series = weeklyChartSeries(points, unit)
  if (series.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'muted-line'
    empty.textContent = 'No weekly volume yet.'
    section.append(empty)
    return section
  }
  const max = Math.max(...series.map((item) => item.value), 1)
  const chart = document.createElement('div')
  chart.className = 'bar-chart'
  chart.setAttribute('role', 'img')
  chart.setAttribute('aria-label', 'Weekly training volume chart')
  for (const item of series.slice(-8)) {
    const bar = document.createElement('div')
    bar.className = 'bar-chart__item'
    bar.innerHTML = `<span>${item.text}</span><i style="height:${Math.max(8, (item.value / max) * 100)}%"></i><small>${item.label}</small>`
    chart.append(bar)
  }
  section.append(chart)
  return section
}
