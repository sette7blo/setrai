import assert from 'node:assert/strict'
import test from 'node:test'
import { createFilterChips, createFilterSheet } from '../../src/client/shared/filter-sheet.js'

class Element {
  children: Element[] = []
  attributes: Record<string, string> = {}
  dataset: Record<string, string> = {}
  listeners: Record<string, () => void> = {}
  textContent = ''
  className = ''
  value = ''
  hidden = false
  removed = false
  constructor(public tag: string) {}
  get childElementCount(): number { return this.children.length }
  append(...children: Element[]): void { this.children.push(...children) }
  setAttribute(key: string, value: string): void { this.attributes[key] = value }
  addEventListener(key: string, listener: () => void): void { this.listeners[key] = listener }
  querySelectorAll(selector: string): Element[] {
    const descendants = this.children.flatMap(child => [child, ...child.querySelectorAll('*')])
    return descendants.filter(item => selector === '*' || item.tag === selector ||
      (selector === '[data-filter-value]' && 'filterValue' in item.dataset))
  }
  close(): void { this.listeners.close?.() }
  remove(): void { this.removed = true }
}

test('filter sheet retains selections, updates counts, searches long lists, resets and restores focus', () => {
  const original = globalThis.document
  globalThis.document = { createElement: (tag: string) => new Element(tag) } as unknown as Document
  try {
    let selected = 'item-2'
    let closed = false
    const dialog = createFilterSheet({ title: 'Filter exercises', resultLabel: 'exercises',
      groups: [{ key: 'equipment', label: 'Equipment', value: selected,
        options: Array.from({ length: 10 }, (_, i) => ({ value: `item-${i}`, label: `Equipment ${i}` })) }],
      count: () => selected ? 2 : 10,
      onChange: (_key, value) => { selected = value }, onReset: () => { selected = '' }, onClose: () => { closed = true }
    }) as unknown as Element
    const choices = dialog.querySelectorAll('[data-filter-value]')
    assert.equal(choices.find(item => item.dataset.filterValue === 'item-2')?.attributes['aria-pressed'], 'true')
    const apply = dialog.querySelectorAll('button').find(item => item.textContent.startsWith('Show'))!
    assert.equal(apply.textContent, 'Show 2 exercises')
    choices[4].listeners.click()
    assert.equal(selected, 'item-3')
    assert.equal(choices.filter(item => item.attributes['aria-pressed'] === 'true').length, 1)
    const search = dialog.querySelectorAll('input')[0]
    search.value = 'equipment 9'
    search.listeners.input()
    assert.equal(choices.filter(item => !item.hidden).length, 2)
    dialog.querySelectorAll('button').find(item => item.textContent === 'Reset filters')!.listeners.click()
    assert.equal(selected, '')
    assert.equal(apply.textContent, 'Show 10 exercises')
    assert.equal(search.value, '')
    assert.equal(choices.every(item => !item.hidden), true)
    apply.listeners.click()
    assert.equal(dialog.removed, true)
    assert.equal(closed, true)
    let removed = ''
    const chips = createFilterChips([{ key: 'muscle', label: 'Muscle', value: 'chest', options: [{ value: 'chest', label: 'Chest' }] }],
      key => { removed = key }, () => { removed = 'all' }) as unknown as Element
    assert.equal(chips.children[0].textContent, 'Muscle: Chest ×')
    chips.children[0].listeners.click()
    assert.equal(removed, 'muscle')
    chips.children[1].listeners.click()
    assert.equal(removed, 'all')
  } finally { globalThis.document = original }
})
