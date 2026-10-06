import type { Capabilities } from '../shared/api/types.js'
import { readableApiError } from '../shared/api/errors.js'
import { renderExerciseDetail } from '../exercises/detail-page.js'
import { renderExerciseLibrary } from '../exercises/page.js'
import { renderHomePage } from './home-page.js'
import { renderProgramDetail } from '../workouts/program-detail-page.js'
import { renderSessionPage } from '../workouts/session-page.js'
import { renderWorkoutsPage } from '../workouts/page.js'
import { renderStatisticsPage } from '../statistics/page.js'
import { renderRecoveryPage } from '../recovery/page.js'
import { renderProfilePage } from '../profile/page.js'
import { renderQuickWorkoutPage } from '../quick-workout/page.js'
import {
  iconElement,
  NAVIGATION_ITEMS
} from './navigation.js'
import {
  capabilityLabel,
  currentPath,
  findRoute,
  primaryNavPath
} from './router.js'
import {
  errorState,
  loadingState
} from './shell-states.js'
import { loadCapabilities } from './capabilities.js'

function navLink(itemPath: string, activePath: string): HTMLAnchorElement {
  const item = NAVIGATION_ITEMS.find((entry) => entry.path === itemPath)

  if (!item) {
    throw new Error(`Unknown navigation item: ${itemPath}`)
  }

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

function desktopNavigation(activePath: string): HTMLElement {
  const nav = document.createElement('nav')
  nav.className = 'sidebar-nav'
  nav.setAttribute('aria-label', 'Primary navigation')

  for (const item of NAVIGATION_ITEMS) {
    nav.append(navLink(item.path, activePath))
  }

  return nav
}

function mobileNavigation(activePath: string): HTMLElement {
  const nav = document.createElement('nav')
  nav.className = 'bottom-nav'
  nav.setAttribute('aria-label', 'Primary navigation')

  for (const item of NAVIGATION_ITEMS.filter((entry) => entry.path !== '/')) {
    nav.append(navLink(item.path, activePath))
  }

  return nav
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
      <a class="button button--primary" href="/workouts">Start from Workouts</a>
      <a class="button button--secondary" href="/exercises">Open Exercises</a>
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

  if (path === '/') {
    await renderHomePage(container)
    return
  }

  if (path === '/exercises') {
    await renderExerciseLibrary(container)
    return
  }

  if (path === '/workouts') {
    await renderWorkoutsPage(container)
    return
  }

  if (path === '/quick-workout') {
    await renderQuickWorkoutPage(container)
    return
  }

  if (path === '/statistics') {
    await renderStatisticsPage(container)
    return
  }

  if (path === '/recovery') {
    await renderRecoveryPage(container)
    return
  }

  if (path === '/profile') {
    await renderProfilePage(container)
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

async function renderShell(root: HTMLElement, capabilities: Capabilities): Promise<void> {
  const activePath = primaryNavPath(currentPath())
  root.replaceChildren()

  const frame = document.createElement('div')
  frame.className = 'app-frame'

  const sidebar = document.createElement('aside')
  sidebar.className = 'app-sidebar'
  sidebar.innerHTML = `
    <a class="brand-mark" href="/" aria-label="Setrai home">
      <img class="brand-mark__logo" src="/brand/setrai-logo-reference.jpg" alt="" aria-hidden="true">
      <span>
        <strong>Setrai</strong>
        <small>AI Training Coach</small>
      </span>
    </a>
  `
  sidebar.append(desktopNavigation(activePath))

  const main = document.createElement('main')
  main.className = 'app-content'
  main.tabIndex = -1

  const top = document.createElement('header')
  top.className = 'top-bar'
  top.innerHTML = `
    <a class="mobile-brand" href="/" aria-label="Setrai home">
      <img class="mobile-brand__logo" src="/brand/setrai-logo-reference.jpg" alt="" aria-hidden="true">
      <span><strong>Setrai</strong><small>AI Training Coach</small></span>
    </a>
    <a class="profile-pill" href="/profile" aria-label="Open profile">
      <img class="profile-pill__avatar" src="/avatars/settebello-reference.jpg" alt="" aria-hidden="true">
      <strong>Settebello</strong>
      <span class="profile-pill__gear" aria-hidden="true">⚙</span>
    </a>
  `

  const container = routeContainer()
  main.append(top, container)
  frame.append(sidebar, main, mobileNavigation(activePath))
  root.append(frame)
  await renderRoute(container, capabilities)
}

export async function bootSetraiApp(root: HTMLElement): Promise<void> {
  root.innerHTML = loadingState()

  try {
    await renderShell(root, await loadCapabilities())
  } catch (error) {
    root.innerHTML = errorState(readableApiError(error))
    root.querySelector('[data-retry]')?.addEventListener('click', () => {
      void bootSetraiApp(root)
    })
  }
}
