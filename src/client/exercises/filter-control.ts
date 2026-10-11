import { displayName } from './format.js'

export function selectControl(labelText: string, value: string, options: string[], onChange: (value: string) => void): HTMLElement {
  const label = document.createElement('label')
  label.className = 'filter-control'
  const span = document.createElement('span')
  span.textContent = labelText
  const select = document.createElement('select')
  select.setAttribute('aria-label', labelText)
  select.append(new Option('All', ''))
  options.forEach((option) => select.append(new Option(displayName(option), option)))
  select.value = value
  select.addEventListener('change', () => onChange(select.value))
  label.append(span, select)
  return label
}

