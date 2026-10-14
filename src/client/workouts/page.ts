import { readableApiError } from '../shared/api/errors.js'
import { listExercises } from '../exercises/api.js'
import { getProfile } from '../profile/api.js'
import { getRecovery } from '../recovery/api.js'
import { createRecoveryWorkoutPanel } from '../quick-workout/recovery-panel.js'
import { recoveryContent } from '../recovery/page.js'
import type { WeightUnit } from '../profile/types.js'
import type { Exercise } from '../exercises/types.js'
import { getSession, listSessions } from './api.js'
import { workoutHeading } from './program-browser.js'
import { renderProgramLibrary } from './program-library.js'
import { createHistoryCalendar } from './history-calendar.js'
import { formatSessionDate, historyHero, sessionDateKey, sessionHistoryCard } from './history-session-card.js'
import type { Session } from './types.js'

export function sessionLinks(sessions: Session[]): HTMLElement {
  const section = document.createElement('section')
  section.className = 'workout-session-links'
  for (const session of sessions.filter(item => !item.finishedAt).slice(0, 1)) {
    const resume = document.createElement('a')
    resume.className = 'button button--primary'
    resume.href = `/sessions/${session.id}`
    resume.textContent = `Resume ${session.programName}`
    section.append(resume)
  }
  return section
}

export function workoutLoadingSkeleton(view: 'library' | 'history'): HTMLElement {
  const skeleton = document.createElement('div')
  skeleton.className = `workout-loading workout-loading--${view}`
  skeleton.setAttribute('aria-hidden', 'true')
  const count = view === 'history' ? 3 : 2
  for (let index = 0; index < count; index += 1) {
    const card = document.createElement('div')
    card.className = 'workout-loading-card'
    card.innerHTML = '<span></span><i></i><b></b>'
    skeleton.append(card)
  }
  return skeleton
}

function renderHistoryView(page: HTMLElement, sessions: Session[], exercises: Exercise[], unit: WeightUnit = 'kg'): void {
  let selectedDate: string | null = null
  page.append(historyHero(sessions))
  const calendar = createHistoryCalendar(sessions, selectedDate, date => {
    selectedDate = date
    renderList()
  })
  const list = document.createElement('div')
  list.className = 'history-session-list'

  const renderList = (): void => {
    list.replaceChildren()
    const visible = selectedDate
      ? sessions.filter(session => sessionDateKey(session) === selectedDate)
      : sessions
    if (selectedDate) {
      const filter = document.createElement('div')
      filter.className = 'history-filter'
      filter.innerHTML = `<div class="history-filter-text"><b>${formatSessionDate(selectedDate)}</b><span>${visible.length} workout${visible.length === 1 ? '' : 's'} on this day</span></div>`
      const clear = document.createElement('button')
      clear.type = 'button'
      clear.className = 'button button--secondary'
      clear.textContent = 'Show all'
      clear.addEventListener('click', () => { selectedDate = null; calendar.dispatchEvent(new Event('history-clear')); renderList() })
      filter.append(clear)
      list.append(filter)
    }
    if (!visible.length) {
      const empty = document.createElement('div')
      empty.className = 'workout-browser-empty'
      empty.textContent = selectedDate ? 'No sessions on this day.' : 'No workout history yet. Start a Quick Workout or run a program to build your timeline.'
      list.append(empty)
      return
    }
    for (const session of visible) list.append(sessionHistoryCard(session, exercises, unit))
  }
  renderList()
  page.append(calendar, list)
}

export async function renderWorkoutsPage(root: HTMLElement, enabled = false, mode: boolean | 'library' | 'discover' | 'history' | 'recovery' = false): Promise<void> {
  let view = mode === true ? 'discover' : mode === false ? 'library' : mode
  if (view === 'discover') {
    const params = new URLSearchParams(window.location.search)
    params.delete('scope')
    window.history.replaceState({}, '', `/workouts${params.size ? `?${params}` : ''}`)
    view = 'library'
  }
  const history = view === 'history'
  const recovery = view === 'recovery'
  const page = document.createElement('div')
  page.className = `workouts-page workout-browser workout-browser--${view}`
  const heading = workoutHeading(view, enabled)
  const state = document.createElement('p')
  state.className = 'workout-browser-status'
  state.setAttribute('role', 'status')
  state.textContent = recovery ? 'Loading muscle recovery...' : history ? 'Loading workout history...' : 'Loading your library...'
  const skeleton = recovery ? null : workoutLoadingSkeleton(history ? 'history' : 'library')
  page.append(heading, state)
  if (skeleton) page.append(skeleton)
  root.replaceChildren(page)
  try {
    if (recovery) {
      const [overview, profile] = await Promise.all([getRecovery(), getProfile().catch(() => ({ equipment: [] as string[] }))])
      state.textContent = ''
      page.append(recoveryContent(overview), createRecoveryWorkoutPanel(profile.equipment))
      return
    }
    if (history) {
      const [sessionList, exercises, profile] = await Promise.all([listSessions(), listExercises(), getProfile().catch(() => ({ weightUnit: 'kg' as const }))])
      const sessions = await Promise.all(sessionList.map(async session => session.finishedAt ? getSession(session.id).catch(() => session) : session))
      skeleton?.remove()
      state.textContent = ''
      renderHistoryView(page, sessions, exercises, profile.weightUnit)
      return
    }
    skeleton?.remove()
    state.textContent = ''
    await renderProgramLibrary(page, enabled, sessionLinks)
  } catch (error) {
    skeleton?.remove()
    state.textContent = readableApiError(error)
    const retry = document.createElement('button')
    retry.className = 'button button--primary'
    retry.textContent = 'Try again'
    retry.addEventListener('click', () => { void renderWorkoutsPage(root, enabled, view) })
    page.append(retry)
  }
}
