import { progressHeading } from '../app/section-navigation.js'
import { statStrip } from '../shared/stat-strip.js'
import { bindPageRetry, pageEmpty, pageError, pageLoading } from '../shared/page-states.js'
import { readableApiError } from '../shared/api/errors.js'
import { displayName } from '../exercises/format.js'
import { getProfile } from '../profile/api.js'
import { listBodyWeight } from '../profile/body-weight/api.js'
import type { BodyWeightEntry } from '../profile/body-weight/types.js'
import type { Profile, WeightUnit } from '../profile/types.js'
import { displayWeightFromKg, formatVolumeKg, formatWeightFromKg } from '../profile/weight-units.js'
import { getStatistics } from './api.js'
import { hasTrainingHistory, normalizeTrainingRange, weeklyVolumeForRange, type TrainingRange } from './format.js'
import { bodyView } from './body-tab.js'
import { stackCardNote, statsCard } from './card.js'
import type { MuscleVolume, PersonalRecord, StatisticsOverview, WeeklyVolumePoint } from './types.js'
import { createVolumeShareExperience } from './volume-share.js'
import { createRecordShareExperience } from './record-share.js'

function loadingView(): HTMLElement {
  return pageLoading({ className: 'statistics-page statistics-page--loading', label: 'Loading progress' })
}

function errorView(message: string): HTMLElement {
  return pageError({ eyebrow: 'Progress', title: 'Progress is unavailable', message, className: 'stats-empty' })
}

function emptyView(): HTMLElement {
  const page = document.createElement('div')
  page.className = 'statistics-page statistics-workstr-page'
  page.append(progressHeading('training'))
  page.append(pageEmpty({
    eyebrow: 'Progress',
    title: 'No completed workouts yet.',
    description: 'Finish your first workout and your volume and records appear here.',
    action: { label: 'Go to Today', href: '/today' },
    className: 'stats-empty statistics-workstr-empty',
  }))
  return page
}

const RANGE_OPTIONS: Array<{ value: TrainingRange, label: string }> = [
  { value: '4w', label: '4W' },
  { value: '3m', label: '3M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
]

function rangeBar(active: TrainingRange, onChange: (range: TrainingRange) => void): HTMLElement {
  const bar = document.createElement('div')
  bar.className = 'stats-segments'
  bar.setAttribute('role', 'group')
  bar.setAttribute('aria-label', 'Training date range')
  RANGE_OPTIONS.forEach(({ value, label }) => {
    const button = document.createElement('button')
    button.className = 'stats-segment'
    button.type = 'button'
    button.setAttribute('aria-pressed', String(value === active))
    button.textContent = label
    button.addEventListener('click', () => onChange(value))
    bar.append(button)
  })
  return bar
}

function updateRangeUrl(range: TrainingRange): void {
  const query = new URLSearchParams(window.location.search)
  if (range === 'all') query.delete('range')
  else query.set('range', range)
  const next = `/statistics${query.size ? `?${query}` : ''}`
  window.history.replaceState({}, '', next)
}

function weekLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function compactVolume(volumeKg: number, unit: WeightUnit): string {
  if (volumeKg <= 0) return ''
  const value = displayWeightFromKg(volumeKg, unit)
  if (value < 1000) return String(Math.round(value))
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function weeklyPanel(points: WeeklyVolumePoint[], unit: WeightUnit, allPoints: WeeklyVolumePoint[], range: TrainingRange): HTMLElement {
  const recent = points.slice(-8)
  const peak = recent.reduce<WeeklyVolumePoint | null>((best, point) => (!best || point.volume > best.volume ? point : best), null)
  const { card: panel, head } = statsCard('Weekly volume', peak && peak.volume > 0 ? `Best week ${formatVolumeKg(peak.volume, unit)}` : '')
  stackCardNote(head)
  let shareDialog: HTMLDialogElement | null = null
  if (allPoints.length > 0) {
    const share = createVolumeShareExperience(allPoints, unit, range)
    head.append(share.button)
    shareDialog = share.dialog
  }
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
      bar.className = `bar${point === recent[recent.length - 1] ? ' latest' : ''}`
      bar.title = `${weekLabel(point.weekStart)}: ${formatVolumeKg(point.volume, unit)}`
      bar.innerHTML = `<span class="bvalue">${compactVolume(point.volume, unit)}</span><div class="fill" style="height:${Math.round((point.volume / max) * 100)}%"></div><span class="blabel">${weekLabel(point.weekStart)}</span>`
      chart.append(bar)
    })
  }
  panel.append(chart)
  if (shareDialog) panel.append(shareDialog)
  return panel
}

function muscleDistribution(rows: MuscleVolume[], unit: WeightUnit): HTMLElement {
  if (rows.length === 0) return Object.assign(document.createElement('p'), { id: 'prog-dist', className: 'stats-card-empty', textContent: 'No logged volume yet.' })
  const dist = document.createElement('div')
  dist.id = 'prog-dist'
  dist.className = 'stats-dist'
  const max = Math.max(1, ...rows.map((row) => row.volume))
  rows.slice(0, 8).forEach((row) => {
    const item = document.createElement('div')
    item.className = 'stats-dist-row'
    const track = document.createElement('div')
    track.className = 'stats-dist-track'
    const fill = document.createElement('div')
    fill.className = 'stats-dist-fill'
    fill.style.width = `${Math.round((row.volume / max) * 100)}%`
    track.append(fill)
    item.append(
      Object.assign(document.createElement('span'), { textContent: displayName(row.muscle) }),
      track,
      Object.assign(document.createElement('span'), { textContent: formatVolumeKg(row.volume, unit) })
    )
    dist.append(item)
  })
  return dist
}

function recordsList(records: PersonalRecord[], unit: WeightUnit): HTMLElement {
  if (records.length === 0) return Object.assign(document.createElement('p'), { id: 'prog-prs', className: 'stats-card-empty', textContent: 'No records yet.' })
  const list = document.createElement('div')
  list.id = 'prog-prs'
  list.className = 'stats-records'
  // Heaviest first, so the order itself is the ranking.
  const ranked = [...records].sort((a, b) => b.estimated1RM - a.estimated1RM).slice(0, 6)
  for (const record of ranked) {
    const row = document.createElement('article')
    row.className = 'stats-record'
    const copy = document.createElement('div')
    copy.className = 'stats-record-copy'
    copy.append(
      Object.assign(document.createElement('strong'), { textContent: record.exerciseName }),
      Object.assign(document.createElement('small'), { textContent: `Top set ${formatWeightFromKg(record.maxWeight, unit)}` })
    )
    const best = Object.assign(document.createElement('strong'), { className: 'stats-record-best', textContent: formatWeightFromKg(record.estimated1RM, unit) })
    const share = createRecordShareExperience(record, unit)
    row.append(copy, best, share.button)
    list.append(row, share.dialog)
  }
  return list
}

function trainingView(stats: StatisticsOverview, unit: WeightUnit): HTMLElement {
  const section = document.createElement('section')
  section.className = 'stats-training-view'
  section.dataset.statsSection = 'training'

  const streakDays = stats.trainingStreak.currentStreakDays ?? stats.trainingStreak.currentStreakWeeks
  const tiles = statStrip([
    { value: String(streakDays), label: stats.trainingStreak.currentStreakDays === undefined ? 'Week streak' : 'Day streak' },
    { value: String(stats.trainingFrequency.totalSessions), label: 'Total sessions' },
    { value: formatVolumeKg(stats.totalVolume, unit), label: 'Total volume' },
  ])
  let activeRange = normalizeTrainingRange(new URLSearchParams(window.location.search).get('range'))
  let range: HTMLElement = document.createElement('div')
  let weekly: HTMLElement = document.createElement('div')
  const selectRange = (next: TrainingRange): void => {
    if (next === activeRange) return
    activeRange = next
    updateRangeUrl(activeRange)
    const nextRange = rangeBar(activeRange, selectRange)
    const nextWeekly = weeklyPanel(weeklyVolumeForRange(stats.weeklyVolume, activeRange), unit, stats.weeklyVolume, activeRange)
    range.replaceWith(nextRange)
    weekly.replaceWith(nextWeekly)
    range = nextRange
    weekly = nextWeekly
  }
  range = rangeBar(activeRange, selectRange)
  weekly = weeklyPanel(weeklyVolumeForRange(stats.weeklyVolume, activeRange), unit, stats.weeklyVolume, activeRange)
  const muscles = statsCard('Muscle distribution', 'By volume')
  muscles.card.append(muscleDistribution([...stats.volumeByMuscle].sort((a, b) => b.volume - a.volume), unit))
  const records = statsCard('Personal records', 'Est. 1RM, heaviest first', 'stats-card--records')
  records.card.append(recordsList(stats.personalRecords, unit))
  section.append(tiles, range, weekly, muscles.card, records.card)
  return section
}

type StatisticsSection = 'training' | 'body'

function renderLoaded(
  root: HTMLElement,
  stats: StatisticsOverview,
  profile: Profile,
  entries: BodyWeightEntry[],
  section: StatisticsSection,
): HTMLElement {
  if (section === 'training' && !hasTrainingHistory(stats)) return emptyView()

  const page = document.createElement('div')
  page.className = 'statistics-page statistics-workstr-page'
  page.append(progressHeading(section))

  const refresh = () => { void renderStatisticsPage(root, section) }
  if (section === 'body') {
    page.append(bodyView({ stats, profile, entries, onRefresh: refresh }))
  } else {
    page.append(trainingView(stats, profile.weightUnit))
  }
  return page
}

export async function renderStatisticsPage(root: HTMLElement, section: StatisticsSection = 'training'): Promise<void> {
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

