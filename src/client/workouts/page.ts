import { libraryHeading, progressHeading } from '../app/section-navigation.js'
import { pageBackHeading } from '../shared/page-chrome.js'
import { readableApiError } from '../shared/api/errors.js'
import { LOADING_DELAY_MS, bindPageRetry, loadingAnnouncement, pageEmpty, pageError, skeleton, skeletonGroup } from '../shared/page-states.js'
import { listExercises } from '../exercises/api.js'
import { getProfile } from '../profile/api.js'
import { getRecovery } from '../recovery/api.js'
import { recoveryContent } from '../recovery/page.js'
import type { WeightUnit } from '../profile/types.js'
import type { Exercise } from '../exercises/types.js'
import { getSession, listSessions } from './api.js'

import { renderProgramLibrary } from './program-library.js'
import { createHistoryCalendar } from './history-calendar.js'
import { formatSessionDate, sessionDateKey, sessionHistoryCard } from './history-session-card.js'
import type { Session } from './types.js'
import { monthlyRecap } from './monthly-recap-data.js'
import { monthlyRecapCard } from './monthly-recap.js'

// Placeholder blocks in the shape of each view, added to the page beside its real heading.
export function workoutLoadingBlocks(view: 'library' | 'history' | 'recovery'): HTMLElement[] {
  if (view === 'recovery') return [skeletonGroup('recovery-panel', skeleton({ height: 110 }), skeleton({ height: 420 }), skeleton({ height: 160 }))]
  if (view === 'history') return [
    skeleton({ height: 110 }), skeleton({ height: 400 }),
    skeletonGroup('history-session-list', ...[85, 85, 85].map(height => skeleton({ height }))),
  ]
  return [skeleton({ height: 44, radius: 'md' }), skeletonGroup('program-list', ...[85, 85, 85, 85, 85].map(height => skeleton({ height })))]
}

function renderHistoryView(page: HTMLElement, sessions: Session[], exercises: Exercise[], unit: WeightUnit = 'kg'): void {
  let selectedDate: string | null = null
  const recap = document.createElement('div')
  recap.className = 'monthly-recap-mount'
  page.append(recap)
  const calendar = createHistoryCalendar(sessions, selectedDate, date => {
    selectedDate = date
    renderList()
  }, month => {
    recap.replaceChildren(monthlyRecapCard(monthlyRecap(sessions, exercises, month), unit))
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
      list.append(pageEmpty({
        title: selectedDate ? 'No sessions on this day.' : 'No workout history yet.',
        description: selectedDate ? undefined : 'Finish a workout and it will appear here.',
        action: selectedDate ? undefined : { label: 'Go to Today', href: '/today' },
        compact: true,
        className: 'workout-browser-empty',
      }))
      return
    }
    for (const session of visible) list.append(sessionHistoryCard(session, exercises, unit))
  }
  renderList()
  page.append(calendar, list)
}

export async function renderWorkoutsPage(
  root: HTMLElement,
  view: 'library' | 'history' | 'recovery' = 'library'
): Promise<void> {
  const history = view === 'history'
  const recovery = view === 'recovery'
  const page = document.createElement('div')
  page.className = `workouts-page workout-browser workout-browser--${view}`
  const heading = history
    ? progressHeading('history')
    : recovery
      ? pageBackHeading({ title: 'Recovery', backHref: '/today', backLabel: 'Today' })
      : libraryHeading('programs')
  page.append(heading)
  root.replaceChildren(page)
  // The heading shows at once; the blocks only if loading outlasts the delay.
  const blocks = [loadingAnnouncement(recovery ? 'Loading muscle recovery' : history ? 'Loading workout history' : 'Loading your library'), ...workoutLoadingBlocks(view)]
  page.setAttribute('aria-busy', 'true')
  const timer = setTimeout(() => { page.append(...blocks) }, LOADING_DELAY_MS)
  const loaded = (): void => {
    clearTimeout(timer)
    blocks.forEach(block => block.remove())
    page.removeAttribute('aria-busy')
  }
  try {
    if (recovery) {
      const overview = await getRecovery()
      loaded()
      page.append(recoveryContent(overview))
      return
    }
    if (history) {
      const [sessionList, exercises, profile] = await Promise.all([listSessions(), listExercises(), getProfile().catch(() => ({ weightUnit: 'kg' as const }))])
      const sessions = await Promise.all(sessionList.map(async session => session.finishedAt ? getSession(session.id).catch(() => session) : session))
      loaded()
      renderHistoryView(page, sessions, exercises, profile.weightUnit)
      return
    }
    await renderProgramLibrary(page, loaded)
  } catch (error) {
    loaded()
    const viewError = pageError({
      eyebrow: 'Workouts',
      title: recovery ? 'Recovery unavailable' : history ? 'History unavailable' : 'Library unavailable',
      message: readableApiError(error),
      className: 'workouts-empty',
    })
    bindPageRetry(viewError, () => { void renderWorkoutsPage(root, view) })
    page.append(viewError)
  }
}
