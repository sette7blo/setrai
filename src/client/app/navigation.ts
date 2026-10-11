import {
  ClipboardList,
  createElement,
  Dumbbell,
  House,
  User,
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
    description: 'Training statistics and body progress'
  },
  {
    path: '/exercises',
    label: 'Exercises',
    icon: Dumbbell,
    description: 'Seeded movement library'
  },
  {
    path: '/workouts',
    label: 'Workouts',
    icon: ClipboardList,
    description: 'Programs and live sessions'
  },

  {
    path: '/profile',
    label: 'Profile',
    icon: User,
    description: 'Training preferences'
  }
]

export function iconElement(icon: IconNode): SVGElement {
  const element = createElement(icon) as SVGElement
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('width', '20')
  element.setAttribute('height', '20')
  return element
}
