import assert from 'node:assert/strict'
import test from 'node:test'
import { createInstructions } from '../../src/client/exercises/detail-view.js'
import { normalizeExercise } from '../../src/client/exercises/format.js'

// Minimal DOM for testing disclosure defaults and text handling without a browser dependency.
class Element {
  children: Element[] = []
  textContent = ''
  className = ''
  open = false
  constructor(public tagName: string) {}
  append(...children: Element[]): void { this.children.push(...children) }
  appendChild(child: Element): Element { this.children.push(child); return child }
  setAttribute(): void {}
}

test('instructions are a closed native disclosure with ordered steps and literal text', () => {
  const original = globalThis.document
  try {
    globalThis.document = {
      createElement: (tag: string) => new Element(tag),
      createElementNS: (_namespace: string, tag: string) => new Element(tag),
      createTextNode: (text: string) => Object.assign(new Element('#text'), { textContent: text })
    } as unknown as Document
    const exercise = normalizeExercise({ id: 1, slug: 'test', name: 'Test', instructions: ['Step one', ' ', '<b>Step two</b>'] })
    const section = createInstructions(exercise) as unknown as Element
    assert.equal(section.tagName, 'details')
    assert.equal(section.open, false)
    assert.equal(section.children[0].tagName, 'summary')
    assert.equal(section.children[1].tagName, 'ol')
    assert.deepEqual(section.children[1].children.map(item => item.textContent), ['Step one', '<b>Step two</b>'])
    const empty = createInstructions({ ...exercise, instructions: [] }) as unknown as Element
    assert.equal(empty.children[1].textContent, 'No instructions are available for this exercise yet.')
  } finally {
    globalThis.document = original
  }
})
