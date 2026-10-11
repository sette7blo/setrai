export { exerciseHero } from './live-media.js'
import { Check, Layers, Repeat2, Hourglass, X, ListOrdered, Plus, Info, Target } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { displayWeightFromKg } from '../profile/weight-units.js'
import type { WeightUnit } from '../profile/types.js'
import type { ProgramExercise } from './types.js'

export function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  element.className = className
  if (text !== undefined) element.textContent = text
  return element
}

export function action(text: string, run: () => void, className = ''): HTMLButtonElement {
  const button = node('button', `live-action ${className}`, text)
  button.type = 'button'
  button.addEventListener('click', run)
  return button
}

export function glyph(name: 'sets' | 'reps' | 'rest' | 'close' | 'list' | 'plus' | 'info' | 'target' | 'check'): SVGElement {
  return iconElement({ sets: Layers, reps: Repeat2, rest: Hourglass, close: X, list: ListOrdered, plus: Plus, info: Info, target: Target, check: Check }[name])
}

export function instructions(exercise: ProgramExercise | undefined, open: Set<string>): HTMLElement {
  const details = node('details', 'live-instructions')
  const key = exercise?.exerciseSlug ?? ''
  details.open = open.has(key)
  const summary = node('summary', '', 'How to perform')
  summary.prepend(glyph('info'))
  details.append(summary)
  const list = node('ol', '')
  for (const step of exercise?.exercise?.instructions ?? []) list.append(node('li', '', step))
  if (!list.children.length) list.append(node('li', '', exercise?.exercise?.description || 'Follow the prescribed movement with controlled form.'))
  details.append(list)
  details.addEventListener('toggle', () => { if (details.open) open.add(key); else open.delete(key) })
  return details
}

export function numberInput(label: string, value: string, field: string, update: (value: string) => void): HTMLInputElement {
  const input = node('input', 'live-input')
  input.type = 'number'
  input.inputMode = field === 'weight' ? 'decimal' : 'numeric'
  input.min = field === 'weight' ? '0' : '1'
  input.step = field === 'weight' ? '0.1' : '1'
  input.value = value
  input.placeholder = '—'
  input.name = field
  input.setAttribute('aria-label', label)
  input.addEventListener('input', () => update(input.value))
  return input
}

export function loadLabel(weight: number | null, unit: WeightUnit): string {
  return weight === null ? '—' : String(displayWeightFromKg(weight, unit))
}

export function countdown(): HTMLElement {
  const ring = node('div', 'live-clock')
  ring.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="live-ring-bg" cx="60" cy="60" r="54"/><circle class="live-ring-fill" cx="60" cy="60" r="54" stroke-dasharray="339.3"/></svg><div class="live-clock-copy"><strong data-clock-value></strong><span class="live-clock-label">seconds</span></div>'
  return ring
}

export function paintCountdown(root: HTMLElement, seconds: number, fraction: number): void {
  const value = root.querySelector<HTMLElement>('[data-clock-value]')
  if (value) value.textContent = String(Math.max(0, seconds))
  const circle = root.querySelector<SVGCircleElement>('.live-ring-fill')
  if (circle) circle.style.strokeDashoffset = String(339.3 * (1 - Math.max(0, Math.min(1, fraction))))
}
