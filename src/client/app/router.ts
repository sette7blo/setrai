export function currentPath(): string {
  return window.location.pathname || '/'
}

// Maps any route to the primary destination that owns it.
export function primaryNavPath(path: string): string {
  if (path === '/' || path === '/today' || path === '/quick-workout' || path === '/recovery' || path === '/statistics/recovery' || path === '/workouts/recovery') {
    return '/today'
  }

  if (path.startsWith('/statistics') || path === '/workouts/history') {
    return '/statistics'
  }

  if (path.startsWith('/library') || path.startsWith('/exercises') || path === '/workouts') {
    return '/library/exercises'
  }

  return path
}
