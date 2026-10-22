export type RoutePreparation = (next: HTMLElement) => Promise<void>

/** Keeps the current route visible until its replacement is fully prepared. */
export function createRouteTransition(): (
  previous: HTMLElement,
  next: HTMLElement,
  prepare: RoutePreparation,
) => Promise<HTMLElement | null> {
  let request = 0
  return async (previous, next, prepare) => {
    const token = ++request
    previous.classList.add('route-container--loading')
    previous.setAttribute('aria-busy', 'true')
    await prepare(next)
    if (token !== request) return null
    previous.replaceWith(next)
    return next
  }
}
