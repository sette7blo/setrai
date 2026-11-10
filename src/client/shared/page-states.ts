/** Shared empty / error / loading kit for product surfaces. */

export interface PageStateAction {
  label: string
  href?: string
  /** When true, renders a button with data-retry for the caller to bind. */
  retry?: boolean
  primary?: boolean
}

export interface PageErrorOptions {
  eyebrow: string
  title: string
  message: string
  className?: string
  action?: PageStateAction
}

export interface PageEmptyOptions {
  title: string
  description?: string
  eyebrow?: string
  action?: PageStateAction
  className?: string
  /** Inline empty (list/chart) without full-page chrome. */
  compact?: boolean
}

export interface SkeletonOptions {
  /** Height in px, unless `aspect` sets it from the width. */
  height?: number
  /** CSS width, for blocks narrower than their column. */
  width?: string
  /** CSS aspect ratio, for blocks whose height follows their width. */
  aspect?: string
  /** Radius token; cards use lg. */
  radius?: 'sm' | 'md' | 'lg' | 'pill'
  /** Layout class from the real screen, so the block sits in the same grid cell as the content. */
  className?: string
}

/** Delay before a placeholder appears; anything faster renders the content directly. */
export const LOADING_DELAY_MS = 150

function actionNode(action: PageStateAction): HTMLElement {
  const primary = action.primary !== false
  const className = primary ? 'button button--primary' : 'button button--secondary'
  if (action.href) {
    const link = document.createElement('a')
    link.className = className
    link.href = action.href
    link.textContent = action.label
    return link
  }
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.textContent = action.label
  if (action.retry) button.dataset.retry = ''
  return button
}

function fillState(
  section: HTMLElement,
  options: {
    eyebrow?: string
    title: string
    description?: string
    action?: PageStateAction
  },
): void {
  if (options.eyebrow) {
    const eyebrow = document.createElement('p')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = options.eyebrow
    section.append(eyebrow)
  }
  const title = document.createElement('h1')
  title.className = 'page-state-title'
  title.textContent = options.title
  section.append(title)
  if (options.description) {
    const description = document.createElement('p')
    description.className = 'page-state-copy'
    description.textContent = options.description
    section.append(description)
  }
  if (options.action) section.append(actionNode(options.action))
}

/** Full-page or section error: eyebrow + title + message + Try again. */
export function pageError(options: PageErrorOptions): HTMLElement {
  const section = document.createElement('section')
  section.className = ['page-state', 'page-state--error', options.className].filter(Boolean).join(' ')
  section.setAttribute('role', 'alert')
  fillState(section, {
    eyebrow: options.eyebrow,
    title: options.title,
    description: options.message,
    action: options.action ?? { label: 'Try again', retry: true, primary: true },
  })
  return section
}

/** Empty product state with optional primary CTA. */
export function pageEmpty(options: PageEmptyOptions): HTMLElement {
  const section = document.createElement(options.compact ? 'div' : 'section')
  section.className = [
    'page-state',
    'page-state--empty',
    options.compact ? 'page-state--compact' : '',
    options.className,
  ].filter(Boolean).join(' ')
  fillState(section, {
    eyebrow: options.compact ? undefined : options.eyebrow,
    title: options.title,
    description: options.description,
    action: options.action,
  })
  if (options.compact) {
    const title = section.querySelector('.page-state-title')
    if (title) {
      const p = document.createElement('p')
      p.className = 'page-state-title'
      p.textContent = title.textContent
      title.replaceWith(p)
    }
  }
  return section
}

/** One placeholder block: the single skeleton primitive every loading state is built from. */
export function skeleton(options: SkeletonOptions = {}): HTMLElement {
  const block = document.createElement('div')
  block.className = ['skeleton', `skeleton--${options.radius ?? 'lg'}`, options.className].filter(Boolean).join(' ')
  block.setAttribute('aria-hidden', 'true')
  if (options.height) block.style.height = `${options.height}px`
  if (options.width) block.style.width = options.width
  if (options.aspect) block.style.aspectRatio = options.aspect
  return block
}

/** A screen's placeholder: real headings and skeleton blocks in the screen's own layout, announced once. */
export function loadingRegion(label: string, className: string, ...children: HTMLElement[]): HTMLElement {
  const region = document.createElement('div')
  region.className = className
  region.setAttribute('aria-busy', 'true')
  region.append(loadingAnnouncement(label), ...children)
  return region
}

/** The one line a screen reader hears for a loading screen; the blocks themselves are hidden from it. */
export function loadingAnnouncement(label: string): HTMLElement {
  const status = document.createElement('p')
  status.className = 'skeleton-label'
  status.setAttribute('role', 'status')
  status.textContent = label
  return status
}

/** A plain container using one of the real screen's layout classes. */
export function skeletonGroup(className: string, ...children: HTMLElement[]): HTMLElement {
  const group = document.createElement('div')
  group.className = className
  group.append(...children)
  return group
}

/**
 * Shows the placeholder only if loading outlasts the delay. Call the returned function once the
 * content (or an error) is ready, before rendering it.
 */
export function showLoadingAfterDelay(root: HTMLElement, build: () => HTMLElement, delayMs = LOADING_DELAY_MS): () => void {
  const timer = setTimeout(() => { root.replaceChildren(build()) }, delayMs)
  return () => clearTimeout(timer)
}

/** Wire data-retry buttons created by pageError. */
export function bindPageRetry(root: HTMLElement, onRetry: () => void): void {
  root.querySelectorAll<HTMLButtonElement>('[data-retry]').forEach((button) => {
    button.addEventListener('click', onRetry)
  })
}
