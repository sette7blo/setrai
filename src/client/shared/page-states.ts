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

export interface PageLoadingOptions {
  className?: string
  blocks?: number
  /** Accessible busy label. */
  label?: string
}

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

/** Generic pulse-block loading placeholder. */
export function pageLoading(options: PageLoadingOptions = {}): HTMLElement {
  const section = document.createElement('section')
  section.className = ['page-state', 'page-state--loading', options.className].filter(Boolean).join(' ')
  section.setAttribute('aria-busy', 'true')
  section.setAttribute('aria-live', 'polite')
  if (options.label) section.setAttribute('aria-label', options.label)
  const count = Math.max(1, options.blocks ?? 3)
  for (let i = 0; i < count; i += 1) {
    const block = document.createElement('div')
    block.className = 'page-state-block'
    section.append(block)
  }
  return section
}

/** Wire data-retry buttons created by pageError. */
export function bindPageRetry(root: HTMLElement, onRetry: () => void): void {
  root.querySelectorAll<HTMLButtonElement>('[data-retry]').forEach((button) => {
    button.addEventListener('click', onRetry)
  })
}
