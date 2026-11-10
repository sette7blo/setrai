import { ChevronRight, Play } from 'lucide'

import { readableApiError } from '../shared/api/errors.js'
import { bindPageRetry, pageError, pageLoading } from '../shared/page-states.js'
import { statStrip } from '../shared/stat-strip.js'
import { displayName } from '../exercises/format.js'
import { getProfile } from '../profile/api.js'
import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
import { createRecoveryWorkoutPanel } from '../quick-workout/recovery-panel.js'
import { getRecovery } from '../recovery/api.js'
import { averageReadiness, recoveryBodyMapMarkup, recoveryPartition } from '../recovery/page.js'
import type { RecoveryOverview } from '../recovery/types.js'
import { getStatistics } from '../statistics/api.js'
import type { StatisticsOverview } from '../statistics/types.js'
import { listSessions } from '../workouts/api.js'
import { formatSessionDate, sessionDuration } from '../workouts/history-session-card.js'
import type { Session } from '../workouts/types.js'
import { iconElement } from './navigation.js'

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text) node.textContent = text
  return node
}

export function readinessSentence(recovery: RecoveryOverview): string {
  const { byRegion } = recoveryPartition(recovery)
  const tired = [...byRegion.entries()]
    .filter(([, item]) => item.status !== 'ready')
    .sort(([, a], [, b]) => a.recovery - b.recovery)
    .slice(0, 3)
    .map(([region]) => displayName(region))
  if (!tired.length) return 'Every muscle group is recovered.'
  if (tired.length === 1) return `${tired[0]} still needs time.`
  return `${tired.slice(0, -1).join(', ')} and ${tired[tired.length - 1]} still need time.`
}

// Volume is bucketed by UTC week on the server, so the newest bucket is only
// "this week" when it starts on the current UTC Monday.
export function currentWeekVolume(stats: StatisticsOverview, now = new Date()): number {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() || 7) - 1))
  const key = monday.toISOString().slice(0, 10)
  return stats.weeklyVolume.find(point => point.weekStart === key)?.volume ?? 0
}

function resumeCard(session: Session): HTMLElement {
  const link = element('a', 'today-resume')
  link.href = `/sessions/${session.id}`
  const copy = element('span', 'today-resume-copy')
  copy.append(element('small', '', 'Workout in progress'), element('strong', '', session.programName || 'Workout'))
  const action = element('span', 'today-resume-action')
  action.append(iconElement(Play), document.createTextNode('Resume'))
  link.append(copy, action)
  return link
}

let readinessCounted = false

// The readiness figure counts up the first time Today is shown after the app loads, and never again.
function countUpOnce(target: HTMLElement, value: number): void {
  if (readinessCounted) return
  readinessCounted = true
  if (value <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const duration = 600
  let start = 0
  target.textContent = '0'
  const step = (now: number): void => {
    start ||= now
    const progress = Math.min(1, (now - start) / duration)
    target.textContent = String(Math.round(value * (1 - (1 - progress) ** 3)))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function readinessCard(recovery: RecoveryOverview): HTMLElement {
  const card = element('a', 'today-readiness')
  card.href = '/recovery'
  card.setAttribute('aria-label', 'Open muscle recovery')
  const copy = element('div', 'today-readiness-copy')
  const figure = element('p', 'today-figure')
  const value = element('strong', '', String(averageReadiness(recovery)))
  countUpOnce(value, averageReadiness(recovery))
  figure.append(value, element('span', '', '% ready'))
  const more = element('span', 'today-more')
  more.append(document.createTextNode('Muscle detail'), iconElement(ChevronRight))
  copy.append(figure, element('p', 'today-readiness-note', readinessSentence(recovery)), more)
  const map = element('div', 'today-map')
  map.innerHTML = recoveryBodyMapMarkup(recovery).replace('id="recovery-body" ', '').replace('class="body-map"', 'class="body-map today-map-body"')
  card.append(copy, map)
  return card
}

function weekStrip(stats: StatisticsOverview, unit: WeightUnit): HTMLElement {
  const streak = stats.trainingStreak.currentStreakDays
  return statStrip([
    { value: String(stats.trainingFrequency.thisWeek), label: stats.trainingFrequency.thisWeek === 1 ? 'workout' : 'workouts' },
    { value: formatVolumeKg(currentWeekVolume(stats), unit), label: 'lifted' },
    streak === undefined
      ? { value: String(stats.trainingStreak.currentStreakWeeks), label: 'week streak' }
      : { value: String(streak), label: 'day streak' },
  ])
}

function lastWorkout(session: Session, label = ''): HTMLElement {
  const link = element('a', 'today-last')
  link.href = '/statistics/history'
  const copy = element('span', 'today-last-copy')
  const details = [formatSessionDate(session.finishedAt ?? session.startedAt), sessionDuration(session)].filter(Boolean).join(', ')
  if (label) copy.append(element('small', '', label))
  copy.append(element('strong', '', session.programName || 'Workout'), element('span', '', details))
  link.append(copy, iconElement(ChevronRight))
  return link
}

function todayHeading(now = new Date()): HTMLElement {
  const header = element('header', 'page-heading today-heading')
  header.append(
    element('p', 'today-date', now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })),
    element('h1', '', 'Today')
  )
  return header
}

function sectionTitle(text: string): HTMLElement {
  return element('h2', 'today-section-title', text)
}

export async function renderTodayPage(root: HTMLElement): Promise<void> {
  root.replaceChildren(pageLoading({ className: 'today-page today-page--loading', label: 'Loading today' }))
  try {
    const [recovery, sessions, stats, profile] = await Promise.all([
      getRecovery(),
      listSessions(),
      getStatistics(),
      getProfile().catch(() => ({ weightUnit: 'kg' as const })),
    ])
    const page = element('div', 'today-page')
    page.append(todayHeading())

    const active = sessions.find(session => !session.finishedAt)
    // Phones show the latest workout; wide screens have room for the last three.
    const finished = sessions.filter(session => session.finishedAt).slice(0, 3)
    const main = element('div', 'today-main')
    main.append(element('h2', 'today-section-title today-section-title--wide', 'Readiness'))
    if (active) main.append(resumeCard(active))
    main.append(readinessCard(recovery))

    const workout = element('section', 'today-workout')
    workout.append(sectionTitle(active ? 'Or build another workout' : 'Suggested workout'))
    workout.append(createRecoveryWorkoutPanel([], { showHeading: false, id: 'quick-workout', autoBuild: !active }))

    const side = element('div', 'today-side')
    side.append(sectionTitle('This week'), weekStrip(stats, profile.weightUnit))
    side.append(...finished.map((session, index) => lastWorkout(session, index === 0 ? 'Last workout' : '')))

    page.append(main, workout, side)
    root.replaceChildren(page)
    if (window.location.hash === '#quick-workout') workout.scrollIntoView({ block: 'start' })
  } catch (error) {
    const view = pageError({ eyebrow: 'Today', title: 'Today is unavailable', message: readableApiError(error) })
    bindPageRetry(view, () => { void renderTodayPage(root) })
    root.replaceChildren(view)
  }
}
