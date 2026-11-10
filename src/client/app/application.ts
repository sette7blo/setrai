import { readableApiError } from '../shared/api/errors.js'
import { pageEmpty } from '../shared/page-states.js'
import { renderExerciseDetail } from '../exercises/detail-page.js'
import { renderExerciseEditor } from '../exercises/editor-page.js'
import { renderExerciseLibrary } from '../exercises/page.js'
import { renderSessionPage } from '../workouts/session-page.js'
import { renderWorkoutsPage } from '../workouts/page.js'
import { listSessions } from '../workouts/api.js'
import { renderStatisticsPage } from '../statistics/page.js'
import { renderProfilePage } from '../profile/page.js'
import { currentPath, primaryNavPath } from './router.js'
import { errorState } from './shell-states.js'
import { installMenuNavigation } from './menu-navigation.js'
import { createRouteTransition } from './route-transition.js'
import { loadCapabilities } from './capabilities.js'
import { bottomNavigation, nowTrainingBar, sidebar, topBar } from './shell-navigation.js'
import { renderTodayPage } from './today-page.js'

// Old paths keep working; each maps to where that screen lives now.
const REDIRECTS: Record<string, string> = {
  '/': '/today',
  '/quick-workout': '/today#quick-workout',
  '/statistics/training': '/statistics',
  '/statistics/recovery': '/recovery',
  '/workouts/recovery': '/recovery',
  '/workouts/history': '/statistics/history',
  '/workouts': '/library/programs',
  '/exercises': '/library/exercises',
}

function applyRedirect(): void {
  const target = REDIRECTS[currentPath()]
  if (!target) return
  const [path, hash] = target.split('#')
  window.history.replaceState({}, '', `${path}${window.location.search}${hash ? `#${hash}` : ''}`)
}

function routeContainer(): HTMLElement {
  const container = document.createElement('div')
  container.className = 'route-container'
  return container
}

function notFound(): HTMLElement {
  return pageEmpty({
    title: 'This page does not exist.',
    description: 'The link may be old. Today has your readiness and next workout.',
    action: { label: 'Go to Today', href: '/today' },
  })
}

async function renderRoute(container: HTMLElement): Promise<void> {
  applyRedirect()
  const path = currentPath()
  document.documentElement.dataset.section = primaryNavPath(path)

  if (path === '/today') return renderTodayPage(container)
  if (path === '/recovery') return renderWorkoutsPage(container, 'recovery')
  if (path === '/statistics') return renderStatisticsPage(container, 'training')
  if (path === '/statistics/body') return renderStatisticsPage(container, 'body')
  if (path === '/statistics/history') return renderWorkoutsPage(container, 'history')
  if (path === '/library/exercises') return renderExerciseLibrary(container)
  if (path === '/library/programs') return renderWorkoutsPage(container)
  if (path === '/profile') return renderProfilePage(container)
  if (path === '/exercises/new') return renderExerciseEditor(container, null)

  const editMatch = path.match(/^\/exercises\/(\d+)\/edit$/)
  if (editMatch) return renderExerciseEditor(container, Number(editMatch[1]))

  const detailMatch = path.match(/^\/exercises\/(\d+)$/)
  if (detailMatch) return renderExerciseDetail(container, Number(detailMatch[1]))

  const sessionMatch = path.match(/^\/sessions\/(\d+)$/)
  if (sessionMatch) return renderSessionPage(container, Number(sessionMatch[1]))

  container.replaceChildren(notFound())
}

async function renderShell(root: HTMLElement, active?: { id: number, programName: string }): Promise<void> {
  applyRedirect()
  const activePath = primaryNavPath(currentPath())
  root.replaceChildren()

  const frame = document.createElement('div')
  frame.className = 'app-frame'

  const main = document.createElement('main')
  main.className = 'app-content'
  main.tabIndex = -1

  let container = routeContainer()
  const bar = topBar()
  main.append(bar.element, container)
  const training = nowTrainingBar(active)
  frame.append(sidebar(activePath), main, training.element, bottomNavigation(activePath))
  root.append(frame)
  window.addEventListener('setrai:session-change', () => { void training.refresh() })

  const transitionRoute = createRouteTransition()
  installMenuNavigation(root, async () => {
    const next = routeContainer()
    const committed = await transitionRoute(container, next, async route => {
      try {
        await renderRoute(route)
      } catch (error) {
        route.innerHTML = errorState(readableApiError(error))
        route.querySelector('[data-retry]')?.addEventListener('click', () => {
          void renderRoute(route)
        })
      }
    })
    if (committed) {
      container = committed
      bar.update(currentPath(), container)
    }
  })
  bar.update(currentPath(), container)
  await renderRoute(container)
}

// Home-screen installs made before Today existed still launch at /statistics.
function launchedFromOldInstall(): boolean {
  return window.location.pathname === '/statistics'
    && window.history.length === 1
    && window.matchMedia('(display-mode: standalone)').matches
}

export async function bootSetraiApp(root: HTMLElement): Promise<void> {
  if (launchedFromOldInstall()) window.history.replaceState({}, '', '/today')

  try {
    // Capabilities gate optional integrations; loading them first keeps a
    // dead server from rendering an empty shell.
    const [, sessions] = await Promise.all([
      loadCapabilities(),
      listSessions().catch(() => [])
    ])
    await renderShell(root, sessions.find(session => !session.finishedAt))
  } catch (error) {
    root.innerHTML = errorState(readableApiError(error))
    root.querySelector('[data-retry]')?.addEventListener('click', () => {
      void bootSetraiApp(root)
    })
  }
}
