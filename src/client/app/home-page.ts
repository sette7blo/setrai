import { readableApiError } from '../shared/api/errors.js'
import { formatDate } from '../shared/formatting/date-format.js'
import { getProfile } from '../profile/api.js'
import { getLatestBodyWeight } from '../profile/body-weight/api.js'
import { latestEntryText } from '../profile/body-weight/format.js'
import { getRecovery } from '../recovery/api.js'
import type { RecoveryOverview } from '../recovery/types.js'
import { getStatistics } from '../statistics/api.js'
import { overviewItems } from '../statistics/format.js'
import type { StatisticsOverview } from '../statistics/types.js'
import { listSessions } from '../workouts/api.js'
import type { Session } from '../workouts/types.js'

export interface HomeSummary {
  activeSession: Session | null
  recentSession: Session | null
  readyCount: number
  moderateCount: number
  recoveringCount: number
  hasTraining: boolean
  weeklyText: string
  streakText: string
  latestWeight: string
}

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'home-page home-page--loading'
  section.innerHTML = '<div></div><div></div><div></div>'
  return section
}

function errorView(message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'state-panel state-panel--error'
  section.innerHTML = `<p class="eyebrow">Home</p><h1>Unable to load dashboard</h1><p>${message}</p><button class="button button--primary" type="button" data-retry>Try again</button>`
  return section
}

export function recoveryCounts(recovery: RecoveryOverview): Pick<HomeSummary, 'readyCount' | 'moderateCount' | 'recoveringCount'> {
  return {
    readyCount: recovery.muscles.filter((item) => item.status === 'ready').length,
    moderateCount: recovery.muscles.filter((item) => item.status === 'moderate').length,
    recoveringCount: recovery.muscles.filter((item) => item.status === 'recovering').length
  }
}

export function chooseActiveSession(sessions: Session[]): Session | null {
  return sessions.find((session) => !session.finishedAt) ?? null
}

export function chooseRecentCompletedSession(sessions: Session[]): Session | null {
  return sessions.find((session) => Boolean(session.finishedAt)) ?? null
}

export function summarizeHome(stats: StatisticsOverview, recovery: RecoveryOverview, sessions: Session[], latestWeight: string): HomeSummary {
  const counts = recoveryCounts(recovery)
  return {
    activeSession: chooseActiveSession(sessions),
    recentSession: chooseRecentCompletedSession(sessions),
    ...counts,
    hasTraining: stats.trainingFrequency.totalSessions > 0,
    weeklyText: `${stats.trainingFrequency.thisWeek} workouts this week`,
    streakText: `${stats.trainingStreak.currentStreakWeeks} week streak`,
    latestWeight
  }
}

function hero(summary: HomeSummary): HTMLElement {
  const section = document.createElement('section')
  section.className = 'home-hero'
  if (summary.activeSession) {
    section.innerHTML = `
      <div><p class="eyebrow">Active workout</p><h1>Resume training</h1><p class="hero-summary">${summary.activeSession.programName} is still in progress.</p></div>
      <a class="button button--primary" href="/sessions/${summary.activeSession.id}">Resume Workout</a>
    `
    return section
  }
  section.innerHTML = `
    <div><p class="eyebrow">Setrai Home</p><h1>Ready to train?</h1><p class="hero-summary">Generate a workout based on your recovery, available equipment, and training goal.</p></div>
    <a class="button button--primary" href="/quick-workout">Quick Workout</a>
  `
  return section
}

function snapshotCard(title: string, body: string, href: string, label: string): HTMLElement {
  const link = document.createElement('a')
  link.href = href
  link.className = 'home-card'
  link.innerHTML = `<h2>${title}</h2><p>${body}</p><span>${label}</span>`
  return link
}

function renderHome(summary: HomeSummary, stats: StatisticsOverview): HTMLElement {
  const page = document.createElement('div')
  page.className = 'home-page'
  page.append(hero(summary))
  const grid = document.createElement('section')
  grid.className = 'home-grid'
  grid.append(
    snapshotCard('Recovery', `${summary.readyCount} ready · ${summary.moderateCount} moderate · ${summary.recoveringCount} recovering`, '/recovery', 'Open recovery'),
    snapshotCard('This week', `${summary.weeklyText} · ${summary.streakText}`, '/statistics', 'View stats')
  )
  if (summary.recentSession) {
    grid.append(snapshotCard('Recent session', `${summary.recentSession.programName} · ${formatDate(summary.recentSession.finishedAt ?? summary.recentSession.startedAt)} · ${summary.recentSession.sets.length} sets`, `/sessions/${summary.recentSession.id}`, 'Review session'))
  } else {
    grid.append(snapshotCard('Start strong', 'No completed workouts yet. Create your first training record today.', '/quick-workout', 'Generate workout'))
  }
  grid.append(snapshotCard('Body weight', summary.latestWeight || 'No body-weight entry yet.', '/profile', 'Log weight'))
  page.append(grid)
  if (!summary.hasTraining) {
    const fresh = document.createElement('section')
    fresh.className = 'home-welcome'
    fresh.innerHTML = `
      <h2>Welcome to Setrai</h2>
      <p>Set your training goal and equipment, browse the seeded exercise library, or generate your first workout.</p>
      <div class="hero-actions"><a class="button button--secondary" href="/profile">Profile</a><a class="button button--secondary" href="/exercises">Exercises</a></div>
    `
    page.append(fresh)
  }
  const details = document.createElement('section')
  details.className = 'home-stats-strip'
  overviewItems(stats, 'kg').forEach((item) => {
    const card = document.createElement('div')
    card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`
    details.append(card)
  })
  page.append(details)
  return page
}

export async function renderHomePage(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const [stats, recovery, sessions, profile, latest] = await Promise.all([
      getStatistics(),
      getRecovery(),
      listSessions(),
      getProfile(),
      getLatestBodyWeight()
    ])
    const latestText = latest ? latestEntryText(latest, profile.weightUnit) : ''
    root.replaceChildren(renderHome(summarizeHome(stats, recovery, sessions, latestText), stats))
  } catch (error) {
    const view = errorView(readableApiError(error))
    view.querySelector('[data-retry]')?.addEventListener('click', () => { void renderHomePage(root) })
    root.replaceChildren(view)
  }
}
