import { Play, Settings } from 'lucide'

import { listSessions } from '../workouts/api.js'
import {
  DESKTOP_NAVIGATION_ITEMS,
  NAVIGATION_ITEMS,
  iconElement,
  type NavigationItem
} from './navigation.js'

function navLink(item: NavigationItem, activePath: string): HTMLAnchorElement {
  const link = document.createElement('a')
  link.href = item.path
  link.className = 'nav-link'
  if (item.path === activePath) {
    link.classList.add('nav-link--active')
    link.setAttribute('aria-current', 'page')
  }
  const icon = document.createElement('span')
  icon.className = 'nav-link-icon'
  icon.append(iconElement(item.icon))
  const label = document.createElement('span')
  label.className = 'nav-link-label'
  label.textContent = item.label
  link.append(icon, label)
  return link
}

function navigation(className: string, items: NavigationItem[], activePath: string): HTMLElement {
  const nav = document.createElement('nav')
  nav.className = className
  nav.setAttribute('aria-label', 'Primary navigation')
  nav.append(...items.map(item => navLink(item, activePath)))
  return nav
}

export function sidebar(activePath: string): HTMLElement {
  const aside = document.createElement('aside')
  aside.className = 'app-sidebar'
  aside.innerHTML = `
    <a class="brand-mark" href="/today" aria-label="Setrai, go to Today">
      <img class="brand-mark__logo" src="/brand/setrai-mark.png" alt="" aria-hidden="true">
      <strong>Setrai</strong>
    </a>
  `
  aside.append(navigation('sidebar-nav', DESKTOP_NAVIGATION_ITEMS, activePath))
  return aside
}

export function topBar(): HTMLElement {
  const top = document.createElement('header')
  top.className = 'top-bar'
  const brand = document.createElement('a')
  brand.className = 'mobile-brand'
  brand.href = '/today'
  brand.setAttribute('aria-label', 'Setrai, go to Today')
  brand.innerHTML = '<img class="mobile-brand__logo" src="/brand/setrai-mark.png" alt="" aria-hidden="true"><strong>Setrai</strong>'
  const settings = document.createElement('a')
  settings.className = 'settings-gear'
  settings.href = '/profile'
  settings.setAttribute('aria-label', 'Open settings')
  settings.append(iconElement(Settings))
  top.append(brand, settings)
  return top
}

export function bottomNavigation(activePath: string): HTMLElement {
  return navigation('bottom-nav', NAVIGATION_ITEMS, activePath)
}

export interface NowTrainingBar {
  element: HTMLAnchorElement
  refresh: () => Promise<void>
}

// Docked above the navigation while a workout is unfinished, so resuming is
// one tap from anywhere without turning a tab into an action.
export function nowTrainingBar(active?: { id: number, programName: string }): NowTrainingBar {
  const bar = document.createElement('a')
  bar.className = 'now-training'
  const copy = document.createElement('span')
  copy.className = 'now-training-copy'
  const label = document.createElement('small')
  label.textContent = 'Workout in progress'
  const name = document.createElement('strong')
  copy.append(label, name)
  const action = document.createElement('span')
  action.className = 'now-training-action'
  action.append(iconElement(Play), document.createTextNode('Resume'))
  bar.append(copy, action)

  const show = (session?: { id: number, programName: string }): void => {
    bar.hidden = !session
    if (!session) return
    bar.href = `/sessions/${session.id}`
    name.textContent = session.programName || 'Workout'
  }
  show(active)

  return {
    element: bar,
    async refresh() {
      try {
        show((await listSessions()).find(session => !session.finishedAt))
      } catch { /* Keep the last known state when the session list is unavailable. */ }
    }
  }
}
