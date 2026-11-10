import {
  createElement,
  House,
  LibraryBig,
  Settings,
  TrendingUp,
  type IconNode
} from 'lucide'

export interface NavigationItem {
  path: string
  label: string
  icon: IconNode
  description: string
}

// Destinations only. Starting or resuming a workout is an action on Today
// and in the now-training bar, never a tab.
export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    path: '/today',
    label: 'Today',
    icon: House,
    description: 'Readiness and the next workout'
  },
  {
    path: '/statistics',
    label: 'Progress',
    icon: TrendingUp,
    description: 'Training volume, history, and body weight'
  },
  {
    path: '/library/exercises',
    label: 'Library',
    icon: LibraryBig,
    description: 'Exercises and programs'
  }
]

export const DESKTOP_NAVIGATION_ITEMS: NavigationItem[] = [
  ...NAVIGATION_ITEMS,
  {
    path: '/profile',
    label: 'Settings',
    icon: Settings,
    description: 'Equipment, units, and training preferences'
  }
]

export function iconElement(icon: IconNode): SVGElement {
  const element = createElement(icon) as SVGElement
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('width', '20')
  element.setAttribute('height', '20')
  return element
}
