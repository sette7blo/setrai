import type { Capabilities } from '../shared/api/types.js'
import { readableApiError } from '../shared/api/errors.js'
import { renderExerciseDetail } from '../exercises/detail-page.js'
import { renderExerciseEditor } from '../exercises/editor-page.js'
import { renderExerciseLibrary } from '../exercises/page.js'
import { renderProgramDetail } from '../workouts/program-detail-page.js'
import { renderSessionPage } from '../workouts/session-page.js'
import { renderWorkoutsPage } from '../workouts/page.js'
import { listSessions } from '../workouts/api.js'
import { openRecoveryWorkoutSheet, shouldOpenRecoveryWorkoutSheet } from '../quick-workout/recovery-sheet.js'
import { renderStatisticsPage } from '../statistics/page.js'
import { renderProfilePage } from '../profile/page.js'
import { Settings } from 'lucide'
import {
  iconElement,
  mobileNavigationItems,
  DESKTOP_NAVIGATION_ITEMS,
  type NavigationItem
} from './navigation.js'
import {
  capabilityLabel,
  currentPath,
  findRoute,
  primaryNavPath
} from './router.js'
import {
  errorState
} from './shell-states.js'
import { installMenuNavigation } from './menu-navigation.js'
import { loadCapabilities } from './capabilities.js'

function navLink(item: NavigationItem, activePath: string): HTMLAnchorElement {
  const link = document.createElement('a')
  link.href = item.path
  link.className = item.path === activePath
    ? 'nav-link nav-link--active'
    : 'nav-link'
  link.setAttribute('aria-label', item.label)
  if (item.path === activePath) {
    link.setAttribute('aria-current', 'page')
  }
  link.append(iconElement(item.icon))

  const label = document.createElement('span')
  label.textContent = item.label
  link.append(label)

  return link
}

interface AppNavigation {
  element: HTMLElement
  quickAction: HTMLAnchorElement
}

function markQuickAction(link: HTMLAnchorElement, resume: boolean, desktop = false): void {
  link.classList.add(desktop ? 'sidebar-quick-action' : 'nav-link--quick')
  link.classList.toggle('nav-link--resume', resume)
}

function desktopNavigation(activePath: string, activeSessionId?: number): AppNavigation {
  const nav = document.createElement('nav')
  nav.className = 'sidebar-nav'
  nav.setAttribute('aria-label', 'Primary navigation')
  const quickAction = navLink(mobileNavigationItems(activeSessionId)[1], activePath)
  markQuickAction(quickAction, Boolean(activeSessionId), true)
  nav.append(
    navLink(DESKTOP_NAVIGATION_ITEMS[0], activePath),
    navLink(DESKTOP_NAVIGATION_ITEMS[1], activePath),
    quickAction,
    navLink(DESKTOP_NAVIGATION_ITEMS[2], activePath)
  )
  return { element: nav, quickAction }
}

function setNavigationItem(link: HTMLAnchorElement, item: NavigationItem): void {
  link.href = item.path
  link.setAttribute('aria-label', item.label)
  const label = document.createElement('span')
  label.textContent = item.label
  link.replaceChildren(iconElement(item.icon), label)
  const selected = item.path === primaryNavPath(currentPath())
  link.classList.toggle('nav-link--active', selected)
  if (selected) link.setAttribute('aria-current', 'page')
  else link.removeAttribute('aria-current')
}

function mobileNavigation(activePath: string, activeSessionId?: number): AppNavigation {
  const nav = document.createElement('nav')
  nav.className = 'bottom-nav'
  nav.setAttribute('aria-label', 'Primary navigation')
  const items = mobileNavigationItems(activeSessionId)
  let quickAction: HTMLAnchorElement | null = null

  for (const [index, item] of items.entries()) {
    const link = navLink(item, activePath)
    if (index === 1) {
      markQuickAction(link, Boolean(activeSessionId))
      quickAction = link
    }
    nav.append(link)
  }

  return { element: nav, quickAction: quickAction! }
}

async function refreshQuickActions(links: HTMLAnchorElement[]): Promise<void> {
  try {
    const active = (await listSessions()).find(session => !session.finishedAt)
    for (const link of links) {
      setNavigationItem(link, mobileNavigationItems(active?.id)[1])
      link.classList.toggle('nav-link--resume', Boolean(active))
    }
  } catch { /* Keep the recovery-aware Quick action when session state is unavailable. */ }
}

function bindQuickAction(link: HTMLAnchorElement): void {
  link.addEventListener('click', event => {
    if (!shouldOpenRecoveryWorkoutSheet(event, link.classList.contains('nav-link--resume'))) return
    event.preventDefault()
    openRecoveryWorkoutSheet(link)
  })
}

function placeholderRoute(capabilities: Capabilities): HTMLElement {
  const route = findRoute(currentPath())
  const section = document.createElement('section')
  section.className = 'hero-card'

  section.innerHTML = `
    <p class="eyebrow">${route.eyebrow}</p>
    <h1>${route.title}</h1>
    <p class="hero-summary">${route.summary}</p>
    <div class="hero-actions">
      <a class="button button--primary" href="/quick-workout">Build Quick Workout</a>
      <a class="button button--secondary" href="/library/exercises">Open Library</a>
    </div>
    <dl class="capability-strip">
      <div>
        <dt>Mode</dt>
        <dd>${capabilityLabel(capabilities)}</dd>
      </div>
      <div>
        <dt>Next action</dt>
        <dd>${route.primaryAction}</dd>
      </div>
    </dl>
  `

  return section
}

function routeContainer(): HTMLElement {
  const container = document.createElement('div')
  container.className = 'route-container'
  return container
}

async function renderRoute(container: HTMLElement, capabilities: Capabilities): Promise<void> {
  const path = currentPath()

  if (path === '/' || path === '/statistics' || path === '/statistics/training') {
    if (path === '/' || path === '/statistics/training') {
      window.history.replaceState({}, '', `/statistics${window.location.search}`)
    }
    await renderStatisticsPage(container, 'training')
    return
  }

  if (path === '/statistics/history') {
    await renderWorkoutsPage(container, 'history')
    return
  }

  if (path === '/statistics/body') {
    await renderStatisticsPage(container, 'body')
    return
  }

  if (path === '/statistics/recovery') {
    await renderWorkoutsPage(container, 'recovery')
    return
  }

  if (path === '/library/exercises') {
    await renderExerciseLibrary(container)
    return
  }

  if (path === '/library/programs') {
    await renderWorkoutsPage(container)
    return
  }

  if (path === '/exercises') {
    window.history.replaceState({}, '', `/library/exercises${window.location.search}`)
    await renderExerciseLibrary(container)
    return
  }

  if (path === '/workouts') {
    window.history.replaceState({}, '', `/library/programs${window.location.search}`)
    await renderWorkoutsPage(container)
    return
  }

  if (path === '/workouts/history') {
    window.history.replaceState({}, '', `/statistics/history${window.location.search}`)
    await renderWorkoutsPage(container, 'history')
    return
  }

  if (path === '/workouts/recovery' || path === '/recovery') {
    window.history.replaceState({}, '', `/statistics/recovery${window.location.search}`)
    await renderWorkoutsPage(container, 'recovery')
    return
  }

  if (path === '/quick-workout') {
    window.history.replaceState({}, '', '/statistics/recovery#quick-workout')
    await renderWorkoutsPage(container, 'recovery')
    openRecoveryWorkoutSheet()
    return
  }

  if (path === '/profile') {
    await renderProfilePage(container)
    return
  }

  if (path === '/exercises/new') {
    await renderExerciseEditor(container, null)
    return
  }

  const editMatch = path.match(/^\/exercises\/(\d+)\/edit$/)
  if (editMatch) {
    await renderExerciseEditor(container, Number(editMatch[1]))
    return
  }

  const detailMatch = path.match(/^\/exercises\/(\d+)$/)
  if (detailMatch) {
    await renderExerciseDetail(container, Number(detailMatch[1]))
    return
  }

  const programMatch = path.match(/^\/programs\/(\d+)$/)
  if (programMatch) {
    await renderProgramDetail(container, Number(programMatch[1]))
    return
  }

  const sessionMatch = path.match(/^\/sessions\/(\d+)$/)
  if (sessionMatch) {
    await renderSessionPage(container, Number(sessionMatch[1]))
    return
  }

  container.replaceChildren(placeholderRoute(capabilities))
}

async function renderShell(root: HTMLElement, capabilities: Capabilities, activeSessionId?: number): Promise<void> {
  const activePath = primaryNavPath(currentPath())
  root.replaceChildren()

  const frame = document.createElement('div')
  frame.className = 'app-frame'

  const sidebar = document.createElement('aside')
  sidebar.className = 'app-sidebar'
  sidebar.innerHTML = `
    <a class="brand-mark" href="/statistics" aria-label="Setrai home">
      <img class="brand-mark__logo" src="/brand/setrai-logo-mark.jpg" alt="" aria-hidden="true">
      <span>
        <strong>Setrai</strong>
        <small>AI Training Coach</small>
      </span>
    </a>
  `
  const desktop = desktopNavigation(activePath, activeSessionId)
  sidebar.append(desktop.element)

  const main = document.createElement('main')
  main.className = 'app-content'
  main.tabIndex = -1

  const top = document.createElement('header')
  top.className = 'top-bar'
  const brand = document.createElement('a')
  brand.className = 'mobile-brand'
  brand.href = '/statistics'
  brand.setAttribute('aria-label', 'Setrai home')
  brand.innerHTML = '<img class="mobile-brand__logo" src="/brand/setrai-logo-mark.jpg" alt="" aria-hidden="true"><span><strong>Setrai</strong><small>AI Training Coach</small></span>'
  const settings = document.createElement('a')
  settings.className = 'settings-gear'
  settings.href = '/profile'
  settings.setAttribute('aria-label', 'Open settings')
  settings.append(iconElement(Settings))
  top.append(brand, settings)

  let container = routeContainer()
  main.append(top, container)
  const mobile = mobileNavigation(activePath, activeSessionId)
  frame.append(sidebar, main, mobile.element)
  root.append(frame)
  const quickActions = [mobile.quickAction, desktop.quickAction]
  const refreshQuickNavigation = (): void => { void refreshQuickActions(quickActions) }
  window.addEventListener('setrai:session-change', refreshQuickNavigation)
  quickActions.forEach(bindQuickAction)

  installMenuNavigation(root, async () => {
    const next = routeContainer()
    container.replaceWith(next)
    container = next
    try {
      await renderRoute(next, capabilities)
    } catch (error) {
      next.innerHTML = errorState(readableApiError(error))
      next.querySelector('[data-retry]')?.addEventListener('click', () => {
        void renderRoute(next, capabilities)
      })
    }
  })
  await renderRoute(container, capabilities)
}

export async function bootSetraiApp(root: HTMLElement): Promise<void> {
  if (window.location.pathname === '/') {
    window.history.replaceState({}, '', '/statistics')
  }

  try {
    const [capabilities, sessions] = await Promise.all([
      loadCapabilities(),
      listSessions().catch(() => [])
    ])
    await renderShell(root, capabilities, sessions.find(session => !session.finishedAt)?.id)
  } catch (error) {
    root.innerHTML = errorState(readableApiError(error))
    root.querySelector('[data-retry]')?.addEventListener('click', () => {
      void bootSetraiApp(root)
    })
  }
}
