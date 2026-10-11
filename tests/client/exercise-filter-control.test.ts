import assert from 'node:assert/strict'
import test from 'node:test'
import { selectControl } from '../../src/client/exercises/filter-control.js'

test('dropdown restores the selected filter after adding options and emits changes', () => {
  const originalDocument = globalThis.document
  const originalOption = globalThis.Option
  class Element {
    children: Element[] = []
    textContent = ''
    className = ''
    storedValue = ''
    listener?: () => void
    constructor(public optionValue = '') {}
    append(...children: Element[]): void { this.children.push(...children) }
    setAttribute(): void {}
    addEventListener(_event: string, listener: () => void): void { this.listener = listener }
    // Model native select behavior: values assigned before options exist are lost.
    set value(value: string) { this.storedValue = this.children.some(child => child.optionValue === value) ? value : '' }
    get value(): string { return this.storedValue }
  }
  try {
    globalThis.document = { createElement: () => new Element() } as unknown as Document
    globalThis.Option = class extends Element {
      constructor(text: string, value: string) { super(value); this.textContent = text }
    } as unknown as typeof Option
    let changed = ''
    const control = selectControl('Muscle', 'chest', ['back', 'chest'], value => { changed = value }) as unknown as Element
    const select = control.children[1]
    assert.equal(select.value, 'chest')
    assert.deepEqual(select.children.map(option => option.optionValue), ['', 'back', 'chest'])
    select.value = 'back'
    select.listener?.()
    assert.equal(changed, 'back')
  } finally {
    globalThis.document = originalDocument
    globalThis.Option = originalOption
  }
})
