import { readableApiError } from '../shared/api/errors.js'
import { getRecovery } from './api.js'
import { sortedRecovery } from './format.js'
import { muscleCard } from './muscle-card.js'

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'recovery-page recovery-page--loading'
  section.innerHTML = '<div></div><div></div><div></div>'
  return section
}

function emptyView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'recovery-empty'
  section.innerHTML = '<p class="eyebrow">Recovery</p><h1>No recent muscle fatigue detected.</h1><p>Complete a workout to start tracking training-readiness estimates.</p><a class="button button--primary" href="/workouts">Start training</a>'
  return section
}

function errorView(message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'recovery-empty'
  section.innerHTML = `<p class="eyebrow">Recovery</p><h1>Recovery unavailable</h1><p>${message}</p><button class="button button--primary" data-retry>Try again</button>`
  return section
}

export async function renderRecoveryPage(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const recovery = await getRecovery()
    if (recovery.muscles.length === 0) {
      root.replaceChildren(emptyView())
      return
    }
    const page = document.createElement('div')
    page.className = 'recovery-page'
    const hero = document.createElement('section')
    hero.className = 'recovery-hero'
    hero.innerHTML = `<p class="eyebrow">Recovery</p><h1>Muscle readiness</h1><p class="hero-summary">Training-readiness estimates from recent completed workouts. Lowest recovery appears first.</p>`
    const grid = document.createElement('div')
    grid.className = 'recovery-grid'
    sortedRecovery(recovery.muscles).forEach((item) => grid.append(muscleCard(item)))
    page.append(hero, grid)
    root.replaceChildren(page)
  } catch (error) {
    const view = errorView(readableApiError(error))
    view.querySelector('[data-retry]')?.addEventListener('click', () => { void renderRecoveryPage(root) })
    root.replaceChildren(view)
  }
}
