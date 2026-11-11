import { ChevronDown } from 'lucide'

import { iconElement } from '../app/navigation.js'

export function category(icon: Parameters<typeof iconElement>[0], title: string, summary: string, status = '', open = false): HTMLDetailsElement {
  const details = document.createElement('details')
  details.className = 'settings-category profile-settings-category'
  if (open) details.open = true
  const head = document.createElement('summary')
  const iconWrap = document.createElement('span')
  iconWrap.className = 'settings-category-icon'
  iconWrap.append(iconElement(icon))
  const copy = document.createElement('span')
  copy.className = 'settings-category-copy'
  const strong = document.createElement('strong')
  strong.textContent = title
  const small = document.createElement('small')
  small.textContent = summary
  copy.append(strong, small)
  const pill = document.createElement('span')
  pill.className = 'status-pill profile-settings-status'
  pill.textContent = status
  const chevron = document.createElement('span')
  chevron.className = 'settings-category-chevron'
  chevron.append(iconElement(ChevronDown))
  head.append(iconWrap, copy, ...(status ? [pill] : []), chevron)
  const body = document.createElement('div')
  body.className = 'settings-category-body'
  details.append(head, body)
  return details
}

export function categoryBody(details: HTMLDetailsElement): HTMLElement {
  return details.querySelector('.settings-category-body') as HTMLElement
}

export function subsection(label: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'settings-subsection'
  const title = document.createElement('span')
  title.className = 'settings-subsection-label'
  title.textContent = label
  wrap.append(title)
  return wrap
}

export function row(title: string, help: string, control: HTMLElement): HTMLElement {
  const item = document.createElement('div')
  item.className = 'settings-row'
  const copy = document.createElement('span')
  copy.className = 'settings-row-copy'
  const strong = document.createElement('strong')
  strong.textContent = title
  const small = document.createElement('small')
  small.textContent = help
  copy.append(strong, small)
  const slot = document.createElement('span')
  slot.className = 'settings-row-control'
  slot.append(control)
  item.append(copy, slot)
  return item
}
