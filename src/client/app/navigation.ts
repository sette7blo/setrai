import {
  ClipboardList,
  createElement,
  Dumbbell,
  House,
  Play,
  Settings,
  Zap,
  type IconNode
} from 'lucide'

export interface NavigationItem {
  path: string
  label: string
  icon: IconNode
  description: string
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    path: '/statistics',
    label: 'Home',
    icon: House,
    description: 'Training volume and body progress'
  },
  {
    path: '/exercises',
    label: 'Exercises',
    icon: Dumbbell,
    description: 'Browse movements and favorites'
  },
  {
    path: '/workouts',
    label: 'Workouts',
    icon: ClipboardList,
    description: 'Programs and live sessions'
  }
]

export const QUICK_WORKOUT_NAVIGATION_ITEM: NavigationItem = {
  path: '/quick-workout',
  label: 'Quick',
  icon: Zap,
  description: 'Build from recovery and training preferences'
}

export function resumeWorkoutNavigationItem(id: number): NavigationItem {
  return {
    path: `/sessions/${id}`,
    label: 'Resume',
    icon: Play,
    description: 'Continue the active workout'
  }
}

export function mobileNavigationItems(activeSessionId?: number): NavigationItem[] {
  return [
    NAVIGATION_ITEMS[0],
    NAVIGATION_ITEMS[1],
    activeSessionId ? resumeWorkoutNavigationItem(activeSessionId) : QUICK_WORKOUT_NAVIGATION_ITEM,
    NAVIGATION_ITEMS[2]
  ]
}

export const DESKTOP_NAVIGATION_ITEMS: NavigationItem[] = [
  ...NAVIGATION_ITEMS,
  {
    path: '/profile',
    label: 'Settings',
    icon: Settings,
    description: 'Identity, equipment, and training preferences'
  }
]

export function iconElement(icon: IconNode): SVGElement {
  const element = createElement(icon) as SVGElement
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('width', '20')
  element.setAttribute('height', '20')
  return element
}
