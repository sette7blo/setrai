import type { Capabilities } from '../shared/api/types.js'

export interface RouteDefinition {
  path: string
  title: string
  eyebrow: string
  summary: string
  primaryAction: string
}

const ROUTES: RouteDefinition[] = [
  {
    path: '/',
    title: 'Home',
    eyebrow: 'Home',
    summary: 'Training volume, session frequency, body weight, and progress trends.',
    primaryAction: 'Review progress'
  },
  {
    path: '/workouts',
    title: 'Workouts',
    eyebrow: 'Workouts',
    summary: 'Programs, history, recovery, and live training.',
    primaryAction: 'Open workouts'
  },
  {
    path: '/statistics',
    title: 'Home',
    eyebrow: 'Home',
    summary: 'Training volume, session frequency, body weight, and progress trends.',
    primaryAction: 'Review progress'
  },
  {
    path: '/statistics/body',
    title: 'Home',
    eyebrow: 'Home',
    summary: 'Body weight, BMI, and goal tracking.',
    primaryAction: 'Log body weight'
  },
  {
    path: '/statistics/training',
    title: 'Home',
    eyebrow: 'Home',
    summary: 'Training volume, session frequency, and progress trends.',
    primaryAction: 'Review progress'
  },
  {
    path: '/recovery',
    title: 'Recovery',
    eyebrow: 'Recovery',
    summary: 'Muscle readiness from recent training, without medical overclaiming.',
    primaryAction: 'Check readiness'
  },
  {
    path: '/profile',
    title: 'Settings',
    eyebrow: 'Settings',
    summary: 'Identity, equipment, training goal, and unit preferences.',
    primaryAction: 'Open settings'
  },
  {
    path: '/quick-workout',
    title: 'Quick Workout',
    eyebrow: 'Quick Workout',
    summary: 'Build a workout from recovery, equipment, and training goal.',
    primaryAction: 'Build workout'
  }
]

export function currentPath(): string {
  return window.location.pathname || '/'
}

export function primaryNavPath(path: string): string {
  if (path === '/' || path.startsWith('/statistics')) {
    return '/statistics'
  }

  if (path.startsWith('/exercises')) {
    return '/exercises'
  }

  if (path.startsWith('/workouts') || path.startsWith('/programs') || path.startsWith('/sessions') || path.startsWith('/quick-workout')) {
    return '/workouts'
  }

  if (path.startsWith('/recovery')) {
    return '/workouts'
  }

  return path
}

export function findRoute(path: string): RouteDefinition {
  return ROUTES.find((route) => route.path === path) ?? ROUTES[0]
}

export function capabilityLabel(capabilities: Capabilities): string {
  const enabled = Object.entries(capabilities)
    .filter(([key, value]) => key !== 'nostrIdentity' && value)
    .map(([key]) => key)

  return enabled.length === 0
    ? 'Self-hosted training mode'
    : `Training plus ${enabled.join(', ')}`
}
