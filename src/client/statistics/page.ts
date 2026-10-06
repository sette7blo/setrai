import { readableApiError } from '../shared/api/errors.js'
import { displayName } from '../exercises/format.js'
import { getProfile } from '../profile/api.js'
import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
import { getStatistics } from './api.js'
import { hasTrainingHistory, overviewItems } from './format.js'
import { overviewCard } from './overview-card.js'
import { weeklyVolumeChart } from './weekly-volume.js'
import { recordsPanel } from './records.js'
import { bodyWeightChart } from './body-weight-chart.js'
import type { StatisticsOverview } from './types.js'

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'statistics-page statistics-page--loading'
  section.innerHTML = '<div></div><div></div><div></div>'
  return section
}

function errorView(message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'stats-empty'
  section.innerHTML = `<p class="eyebrow">Statistics</p><h1>Statistics unavailable</h1><p>${message}</p><button class="button button--primary" data-retry>Try again</button>`
  return section
}

function emptyView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'stats-empty'
  section.innerHTML = '<p class="eyebrow">Statistics</p><h1>No completed workouts yet.</h1><p>Finish your first workout to start building your statistics.</p><a class="button button--primary" href="/workouts">Start training</a>'
  return section
}

function leaderboard(title: string, rows: Array<{ name: string, volume: number }>, unit: WeightUnit): HTMLElement {
  const section = document.createElement('section')
  section.className = 'stats-panel'
  section.innerHTML = `<h2>${title}</h2>`
  if (rows.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'muted-line'
    empty.textContent = 'No volume data yet.'
    section.append(empty)
    return section
  }
  const list = document.createElement('ol')
  list.className = 'stats-list'
  for (const row of rows.slice(0, 6)) {
    const item = document.createElement('li')
    item.innerHTML = `<span>${row.name}</span><strong>${formatVolumeKg(row.volume, unit)}</strong>`
    list.append(item)
  }
  section.append(list)
  return section
}

function renderLoaded(stats: StatisticsOverview, unit: WeightUnit): HTMLElement {
  if (!hasTrainingHistory(stats)) return emptyView()
  const page = document.createElement('div')
  page.className = 'statistics-page'
  const hero = document.createElement('section')
  hero.className = 'stats-hero'
  hero.innerHTML = `<div><p class="eyebrow">Statistics</p><h1>Training progress</h1><p class="hero-summary">Deterministic Setrai stats from completed workout history.</p></div>`
  const cards = document.createElement('div')
  cards.className = 'stats-card-grid'
  overviewItems(stats, unit).forEach((item) => cards.append(overviewCard(item.label, item.value)))
  page.append(hero, cards)
  page.append(weeklyVolumeChart(stats.weeklyVolume, unit))
  page.append(recordsPanel(stats.personalRecords, unit))
  page.append(leaderboard('Top exercises', [...stats.volumeByExercise].sort((a, b) => b.volume - a.volume).map((row) => ({ name: row.exerciseName, volume: row.volume })), unit))
  page.append(leaderboard('Muscle volume', [...stats.volumeByMuscle].sort((a, b) => b.volume - a.volume).map((row) => ({ name: displayName(row.muscle), volume: row.volume })), unit))
  page.append(bodyWeightChart(stats.bodyWeight, unit))
  return page
}

export async function renderStatisticsPage(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const [stats, profile] = await Promise.all([getStatistics(), getProfile()])
    root.replaceChildren(renderLoaded(stats, profile.weightUnit))
  } catch (error) {
    const view = errorView(readableApiError(error))
    view.querySelector('[data-retry]')?.addEventListener('click', () => { void renderStatisticsPage(root) })
    root.replaceChildren(view)
  }
}
