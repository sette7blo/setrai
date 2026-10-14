import { BicepsFlexed, CalendarCheck, ChartColumn, Flame, Trophy, Weight } from 'lucide'

import { iconElement } from '../app/navigation.js'
import { pageHeading, pageSummary } from '../shared/page-chrome.js'
import { bindPageRetry, pageEmpty, pageError, pageLoading } from '../shared/page-states.js'
import { readableApiError } from '../shared/api/errors.js'
import { displayName } from '../exercises/format.js'
import { getProfile } from '../profile/api.js'
import { listBodyWeight } from '../profile/body-weight/api.js'
import type { BodyWeightEntry } from '../profile/body-weight/types.js'
import type { Profile, WeightUnit } from '../profile/types.js'
import { formatVolumeKg, formatWeightFromKg } from '../profile/weight-units.js'
import { getStatistics } from './api.js'
import { hasTrainingHistory } from './format.js'
import { bodyView } from './body-tab.js'
import type { MuscleVolume, PersonalRecord, StatisticsOverview, WeeklyVolumePoint } from './types.js'

function loadingView(): HTMLElement {
  return pageLoading({ className: 'statistics-page statistics-page--loading', label: 'Loading home' })
}

function errorView(message: string): HTMLElement {
  return pageError({ eyebrow: 'Home', title: 'Home unavailable', message, className: 'stats-empty' })
}

function emptyView(): HTMLElement {
  const page = document.createElement('div')
  page.className = 'statistics-page statistics-workstr-page'
  page.append(homeHeading('training'))
  page.append(pageEmpty({
    eyebrow: 'Home',
    title: 'No completed workouts yet.',
    description: 'Finish your first workout to start building your timeline.',
    action: { label: 'Start training', href: '/workouts' },
    className: 'stats-empty statistics-workstr-empty',
  }))
  return page
}

function iconWrap(className: string, icon: Parameters<typeof iconElement>[0]): HTMLElement {
  const span = document.createElement('span')
  span.className = className
  span.append(iconElement(icon))
  return span
}

function statsHero(icon: Parameters<typeof iconElement>[0], title: string, help: string): HTMLElement {
  return pageSummary({
    icon,
    title,
    description: help,
    className: 'stats-hero-card page-summary',
  })
}

function statTile(icon: Parameters<typeof iconElement>[0], value: string, label: string, tone = ''): HTMLElement {
  const tile = document.createElement('article')
  tile.className = `summary-stat${tone ? ` ${tone}` : ''}`
  tile.append(iconWrap('ss-icon', icon))
  const number = document.createElement('div')
  number.className = 'ss-val'
  number.textContent = value
  const caption = document.createElement('div')
  caption.className = 'ss-label'
  caption.textContent = label
  tile.append(number, caption)
  return tile
}

function sectionHead(icon: Parameters<typeof iconElement>[0], title: string, note = ''): HTMLElement {
  const head = document.createElement('div')
  head.className = 'subsection-head stats-section-head'
  const name = document.createElement('span')
  name.className = 'stats-section-title'
  name.append(iconElement(icon), Object.assign(document.createElement('span'), { textContent: title }))
  head.append(name)
  if (note) head.append(Object.assign(document.createElement('small'), { textContent: note }))
  return head
}

function rangeBar(): HTMLElement {
  const labels = ['4W', '3M', '1Y', 'All']
  const bar = document.createElement('div')
  bar.className = 'stats-range'
  bar.setAttribute('role', 'group')
  bar.setAttribute('aria-label', 'Training date range')
  labels.forEach((label) => {
    const button = document.createElement('button')
    button.className = `stats-range-btn${label === 'All' ? ' active' : ''}`
    button.type = 'button'
    button.setAttribute('aria-pressed', String(label === 'All'))
    button.textContent = label
    bar.append(button)
  })
  return bar
}

function weekLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function weeklyPanel(points: WeeklyVolumePoint[], unit: WeightUnit): HTMLElement {
  const panel = document.createElement('section')
  panel.className = 'panel stats-panel'
  const recent = points.slice(-8)
  const peak = recent.reduce<WeeklyVolumePoint | null>((best, point) => (!best || point.volume > best.volume ? point : best), null)
  const peakNote = peak && peak.volume > 0 ? `best week ${formatVolumeKg(peak.volume, unit)}` : ''
  panel.append(sectionHead(ChartColumn, 'Weekly volume', peakNote))
  const chart = document.createElement('div')
  chart.id = 'prog-bars'
  chart.className = 'bars'
  if (recent.length === 0) {
    chart.classList.add('empty')
    chart.textContent = 'No logged volume yet.'
  } else {
    const max = Math.max(1, ...recent.map((point) => point.volume))
    recent.forEach((point) => {
      const bar = document.createElement('div')
      bar.className = `bar${point === peak && point.volume > 0 ? ' peak' : ''}`
      bar.title = `${weekLabel(point.weekStart)}: ${formatVolumeKg(point.volume, unit)}`
      bar.innerHTML = `<div class="fill" style="height:${Math.round((point.volume / max) * 100)}%"></div><span class="blabel">${weekLabel(point.weekStart)}</span>`
      chart.append(bar)
    })
  }
  panel.append(chart)
  return panel
}

function muscleDistribution(rows: MuscleVolume[], unit: WeightUnit): HTMLElement {
  const dist = document.createElement('div')
  dist.id = 'prog-dist'
  dist.className = 'dist'
  if (rows.length === 0) {
    dist.classList.add('empty')
    dist.textContent = 'No logged volume yet.'
    return dist
  }
  const max = Math.max(1, ...rows.map((row) => row.volume))
  rows.slice(0, 8).forEach((row) => {
    const item = document.createElement('div')
    item.className = 'dist-row'
    item.innerHTML = `<small>${displayName(row.muscle)}</small><div class="track"><div class="fill" style="width:${Math.round((row.volume / max) * 100)}%"></div></div><small>${formatVolumeKg(row.volume, unit)}</small>`
    dist.append(item)
  })
  return dist
}

function recordsList(records: PersonalRecord[], unit: WeightUnit): HTMLElement {
  const list = document.createElement('div')
  list.id = 'prog-prs'
  list.className = 'list stats-records'
  if (records.length === 0) {
    list.classList.add('empty')
    list.textContent = 'No records yet.'
    return list
  }
  records.slice(0, 6).forEach((record, index) => {
    const row = document.createElement('article')
    row.className = `row stats-record${index < 3 ? ` top-${index + 1}` : ''}`
    const rank = document.createElement('span')
    rank.className = 'stats-record-rank'
    if (index === 0) rank.append(iconElement(Trophy))
    else rank.textContent = String(index + 1)
    row.append(rank)
    const copy = document.createElement('div')
    copy.innerHTML = `<strong>${record.exerciseName}</strong><small>top set ${formatWeightFromKg(record.maxWeight, unit)}</small>`
    const badge = document.createElement('span')
    badge.className = 'badge muscle'
    badge.textContent = `${formatWeightFromKg(record.estimated1RM, unit)} 1RM`
    row.append(copy, badge)
    list.append(row)
  })
  return list
}

function trainingView(stats: StatisticsOverview, unit: WeightUnit): HTMLElement {
  const section = document.createElement('section')
  section.className = 'stats-training-view'
  section.dataset.statsSection = 'training'
  section.append(statsHero(ChartColumn, 'Training', 'Streak, volume and records from finished workouts.'))

  const tiles = document.createElement('div')
  tiles.className = 'stats-hero'
  const streakDays = stats.trainingStreak.currentStreakDays ?? stats.trainingStreak.currentStreakWeeks
  tiles.append(
    statTile(Flame, String(streakDays), stats.trainingStreak.currentStreakDays === undefined ? 'Week streak' : 'Day streak', streakDays > 0 ? 'streak' : ''),
    statTile(CalendarCheck, String(stats.trainingFrequency.totalSessions), 'Total sessions'),
    statTile(Weight, formatVolumeKg(stats.totalVolume, unit), 'Total volume')
  )
  section.append(tiles, rangeBar(), weeklyPanel(stats.weeklyVolume, unit))
  const panel = document.createElement('section')
  panel.className = 'panel stats-panel'
  panel.append(
    sectionHead(BicepsFlexed, 'Muscle distribution', 'by volume'),
    muscleDistribution([...stats.volumeByMuscle].sort((a, b) => b.volume - a.volume), unit),
    sectionHead(Trophy, 'Personal records', 'best estimated 1RM'),
    recordsList(stats.personalRecords, unit)
  )
  section.append(panel)
  return section
}

export type HomeSection = 'training' | 'body'

function homeHeading(section: HomeSection): HTMLElement {
  return pageHeading({
    title: 'Home',
    className: 'statistics-page-head',
    tabsLabel: 'Home sections',
    tabs: [
      { id: 'training', label: 'Training', href: '/statistics', active: section === 'training' },
      { id: 'body', label: 'Body', href: '/statistics/body', active: section === 'body' },
    ],
  })
}

function renderLoaded(
  root: HTMLElement,
  stats: StatisticsOverview,
  profile: Profile,
  entries: BodyWeightEntry[],
  section: HomeSection,
): HTMLElement {
  if (section === 'training' && !hasTrainingHistory(stats)) return emptyView()

  const page = document.createElement('div')
  page.className = 'statistics-page statistics-workstr-page'
  page.append(homeHeading(section))

  const refresh = () => { void renderStatisticsPage(root, section) }
  if (section === 'body') {
    page.append(bodyView({ stats, profile, entries, onRefresh: refresh }))
  } else {
    page.append(trainingView(stats, profile.weightUnit))
  }
  return page
}

export async function renderStatisticsPage(root: HTMLElement, section: HomeSection = 'training'): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const [stats, profile, entries] = await Promise.all([getStatistics(), getProfile(), listBodyWeight()])
    root.replaceChildren(renderLoaded(root, stats, profile, entries, section))
  } catch (error) {
    const view = errorView(readableApiError(error))
    bindPageRetry(view, () => { void renderStatisticsPage(root, section) })
    root.replaceChildren(view)
  }
}

