import { X } from 'lucide'
import { iconElement } from '../app/navigation.js'
export interface FilterOption { value: string; label: string }
export interface FilterGroup {
  key: string
  label: string
  value: string
  options: FilterOption[]
}

export function createFilterSheet(options: {
  title: string
  resultLabel: string
  groups: FilterGroup[]
  count: () => number
  onChange: (key: string, value: string) => void
  onReset: () => void
  onClose: () => void
}): HTMLDialogElement {
  const dialog = document.createElement('dialog')
  dialog.className = 'filter-sheet'
  dialog.setAttribute('aria-label', options.title)
  const heading = document.createElement('header')
  heading.className = 'filter-sheet__heading'
  const title = document.createElement('h2')
  title.textContent = options.title
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'filter-sheet__close'
  close.setAttribute('aria-label', 'Close filters')
  close.append(iconElement(X))
  close.addEventListener('click', () => dialog.close())
  heading.append(title, close)
  const content = document.createElement('div')
  content.className = 'filter-sheet__content'
  const apply = document.createElement('button')
  apply.type = 'button'
  apply.className = 'button button--primary'
  const update = (): void => { apply.textContent = `Show ${options.count()} ${options.resultLabel}` }
  for (const facet of options.groups) {
    const group = document.createElement('fieldset')
    const legend = document.createElement('legend')
    legend.textContent = facet.label
    group.append(legend)
    const values = [{ value: '', label: 'Any' }, ...facet.options]
    if (facet.value && !values.some(option => option.value === facet.value)) {
      values.push({ value: facet.value, label: facet.value })
    }
    const choices = document.createElement('div')
    choices.className = 'filter-sheet__choices'
    for (const option of values) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'filter-sheet__option'
      button.textContent = option.label
      button.dataset.filterKey = facet.key
      button.dataset.filterValue = option.value
      button.setAttribute('aria-pressed', String(facet.value === option.value))
      button.addEventListener('click', () => {
        options.onChange(facet.key, option.value)
        choices.querySelectorAll<HTMLButtonElement>('button').forEach(item => {
          item.setAttribute('aria-pressed', String(item.dataset.filterValue === option.value))
        })
        update()
      })
      choices.append(button)
    }
    if (facet.options.length > 8) {
      const search = document.createElement('input')
      search.type = 'search'
      search.className = 'filter-sheet__search'
      search.placeholder = `Search ${facet.label.toLowerCase()}`
      search.setAttribute('aria-label', search.placeholder)
      search.addEventListener('input', () => {
        const query = search.value.trim().toLowerCase()
        choices.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
          button.hidden = Boolean(button.dataset.filterValue && !button.textContent?.toLowerCase().includes(query))
        })
      })
      group.append(search)
    }
    group.append(choices)
    content.append(group)
  }
  const reset = document.createElement('button')
  reset.type = 'button'
  reset.className = 'button button--secondary'
  reset.textContent = 'Reset filters'
  reset.addEventListener('click', () => {
    options.onReset()
    content.querySelectorAll<HTMLButtonElement>('[data-filter-value]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filterValue === ''))
      button.hidden = false
    })
    content.querySelectorAll<HTMLInputElement>('input').forEach(input => { input.value = '' })
    update()
  })
  apply.addEventListener('click', () => dialog.close())
  const footer = document.createElement('footer')
  footer.className = 'filter-sheet__footer'
  footer.append(reset, apply)
  dialog.append(heading, content, footer)
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
  })
  dialog.addEventListener('close', () => { dialog.remove(); options.onClose() })
  update()
  return dialog
}

export function createFilterChips(groups: FilterGroup[], onRemove: (key: string) => void, onClear: () => void): HTMLElement {
  const row = document.createElement('div')
  row.className = 'active-filter-chips'
  for (const group of groups.filter(item => item.value)) {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.textContent = `${group.label}: ${group.options.find(item => item.value === group.value)?.label || group.value} ×`
    chip.setAttribute('aria-label', `Remove ${group.label.toLowerCase()} filter`)
    chip.addEventListener('click', () => onRemove(group.key))
    row.append(chip)
  }
  if (row.childElementCount) {
    const clear = document.createElement('button')
    clear.type = 'button'
    clear.textContent = 'Clear filters'
    clear.addEventListener('click', onClear)
    row.append(clear)
  }
  return row
}
