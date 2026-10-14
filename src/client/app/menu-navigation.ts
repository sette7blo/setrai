import { primaryNavPath } from './router.js'

export function menuDestination(
  href: string, currentUrl: string, target = '', download = false
): URL | null {
  const current = new URL(currentUrl)
  const next = new URL(href, current)
  if (download || (target && target !== '_self') || next.origin !== current.origin || next.hash) return null
  // Live sessions currently rely on document teardown to stop their rest timer.
  if (current.pathname.startsWith('/sessions/') || next.pathname.startsWith('/sessions/')) return null
  return next
}

export function installMenuNavigation(
  root: HTMLElement, showRoute: () => Promise<void>
): () => void {
  let displayedPath = window.location.pathname
  const activate = (): void => {
    displayedPath = window.location.pathname
    const active = primaryNavPath(displayedPath)
    root.querySelectorAll<HTMLAnchorElement>('.nav-link').forEach(link => {
      const selected = new URL(link.href).pathname === active
      link.classList.toggle('nav-link--active', selected)
      if (selected) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
    window.scrollTo(0, 0)
    void showRoute()
  }
  const click = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>('a.nav-link, a.brand-mark, a.mobile-brand, a.settings-gear, a.page-tab')
      : null
    if (!link) return
    const destination = menuDestination(link.href, window.location.href, link.target, link.hasAttribute('download'))
    if (!destination) return
    event.preventDefault()
    if (destination.href === window.location.href) return
    window.history.pushState({}, '', destination)
    activate()
  }
  const popstate = (): void => {
    if (displayedPath.startsWith('/sessions/') || window.location.pathname.startsWith('/sessions/')) {
      window.location.reload()
      return
    }
    activate()
  }
  root.addEventListener('click', click)
  window.addEventListener('popstate', popstate)
  return () => {
    root.removeEventListener('click', click)
    window.removeEventListener('popstate', popstate)
  }
}
