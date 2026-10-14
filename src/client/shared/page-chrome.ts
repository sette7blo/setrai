import type { IconNode } from 'lucide'
import { iconElement } from '../app/navigation.js'

export interface PageTab {
  id: string
  label: string
  href?: string
  active?: boolean
}

export interface PageMetric {
  icon?: IconNode
  text: string
  tone?: string
}

export interface PageHeadingOptions {
  title: string
  tabs?: PageTab[]
  tabsLabel?: string
  className?: string
}

export interface PageSummaryOptions {
  icon: IconNode
  title: string
  description?: string
  metrics?: PageMetric[]
  href?: string
  ariaLabel?: string
  className?: string
  trailing?: boolean
}

/** Main tab page title + optional section tabs. */
export function pageHeading(options: PageHeadingOptions): HTMLElement {
  const header = document.createElement('header')
  header.className = ['page-heading', options.className].filter(Boolean).join(' ')

  const title = document.createElement('h1')
  title.textContent = options.title
  header.append(title)

  if (options.tabs?.length) {
    const nav = document.createElement('nav')
    nav.className = 'page-tabs'
    nav.setAttribute('aria-label', options.tabsLabel ?? 'Section tabs')
    for (const tab of options.tabs) {
      if (tab.href) {
        const link = document.createElement('a')
        link.className = `page-tab${tab.active ? ' page-tab--active' : ''}`
        link.href = tab.href
        link.textContent = tab.label
        if (tab.active) link.setAttribute('aria-current', 'page')
        link.dataset.pageTab = tab.id
        nav.append(link)
      } else {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = `page-tab${tab.active ? ' page-tab--active' : ''}`
        button.textContent = tab.label
        button.dataset.pageTab = tab.id
        button.setAttribute('aria-pressed', String(Boolean(tab.active)))
        nav.append(button)
      }
    }
    header.append(nav)
  }

  return header
}

/** Compact status/metrics card under the page heading. */
export function pageSummary(options: PageSummaryOptions): HTMLElement {
  const tag = options.href ? 'a' : 'section'
  const card = document.createElement(tag) as HTMLElement
  card.className = ['page-summary', options.className].filter(Boolean).join(' ')
  if (options.href) {
    ;(card as HTMLAnchorElement).href = options.href
    if (options.ariaLabel) card.setAttribute('aria-label', options.ariaLabel)
  }

  const icon = document.createElement('span')
  icon.className = 'page-summary-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.append(iconElement(options.icon))

  const copy = document.createElement('div')
  copy.className = 'page-summary-copy'

  const title = document.createElement('strong')
  title.className = 'page-summary-title'
  title.textContent = options.title
  copy.append(title)

  if (options.description) {
    const description = document.createElement('p')
    description.className = 'page-summary-description'
    description.textContent = options.description
    copy.append(description)
  }

  if (options.metrics?.length) {
    const metrics = document.createElement('div')
    metrics.className = 'page-summary-metrics'
    for (const metric of options.metrics) {
      const item = document.createElement('span')
      if (metric.tone) item.classList.add(`page-summary-metric--${metric.tone}`)
      if (metric.icon) item.append(iconElement(metric.icon))
      item.append(document.createTextNode(metric.text))
      metrics.append(item)
    }
    copy.append(metrics)
  }

  card.append(icon, copy)

  if (options.trailing) {
    const chevron = document.createElement('span')
    chevron.className = 'page-summary-trailing'
    chevron.setAttribute('aria-hidden', 'true')
    chevron.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
    card.append(chevron)
  }

  return card
}
