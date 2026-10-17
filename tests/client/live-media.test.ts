import assert from 'node:assert/strict'
import test from 'node:test'
import { exerciseHero } from '../../src/client/workouts/live-media.js'
import { normalizeProgramExercise } from '../../src/client/workouts/format.js'

class Element {
  children: Element[] = []
  dataset: Record<string, string> = {}
  attributes: Record<string, string> = {}
  listeners: Record<string, () => void> = {}
  className = ''
  textContent = ''
  constructor(public tag: string) {}
  classList = { add: (value: string): void => { this.className += ` ${value}` } }
  append(...children: Element[]): void { this.children.push(...children) }
  appendChild(child: Element): Element { this.children.push(child); return child }
  replaceChildren(...children: Element[]): void { this.children = children }
  setAttribute(key: string, value: string): void { this.attributes[key] = value }
  addEventListener(key: string, listener: () => void): void { this.listeners[key] = listener }
  querySelector(tag: string): Element | null {
    for (const child of this.children) {
      if (child.tag === tag) return child
      const found = child.querySelector(tag)
      if (found) return found
    }
    return null
  }
  remove(): void {}
}

test('live image size defaults to compact, toggles, persists, and works without device storage', () => {
  const originalDocument = globalThis.document
  const originalStorage = globalThis.localStorage
  const values = new Map<string, string>()
  try {
    globalThis.document = {
      createElement: (tag: string) => new Element(tag),
      createElementNS: (_namespace: string, tag: string) => new Element(tag),
      createTextNode: (text: string) => Object.assign(new Element('#text'), { textContent: text })
    } as unknown as Document
    globalThis.localStorage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) } } as unknown as Storage
    const entry = normalizeProgramExercise({ exerciseSlug: 'press', exerciseName: 'Press',
      exercise: { id: 1, slug: 'press', name: 'Press', imageUrl: '/images/exercises/seed/press.webp' } })
    const hero = exerciseHero(entry) as unknown as Element
    const toggle = hero.children[1]
    assert.equal(hero.dataset.size, 'compact')
    assert.equal(toggle.attributes['aria-label'], 'Enlarge exercise image')
    toggle.listeners.click()
    assert.equal(hero.dataset.size, 'expanded')
    assert.equal(toggle.attributes['aria-label'], 'Reduce exercise image')
    assert.equal(toggle.attributes['aria-pressed'], 'true')
    const next = exerciseHero(entry) as unknown as Element
    assert.equal(next.dataset.size, 'expanded')
    next.children[1].listeners.click()
    assert.equal((exerciseHero(entry) as unknown as Element).dataset.size, 'compact')
    globalThis.localStorage = { getItem: () => { throw new Error('Unavailable') },
      setItem: () => { throw new Error('Unavailable') } } as unknown as Storage
    const unavailable = exerciseHero(entry) as unknown as Element
    unavailable.children[1].listeners.click()
    assert.equal(unavailable.dataset.size, 'expanded')
    const empty = exerciseHero(undefined) as unknown as Element
    assert.equal(empty.children.length, 1)
    assert.equal(empty.children[0].textContent, 'Training session')
    const remote = normalizeProgramExercise({ exerciseSlug: 'legacy', exerciseName: 'Legacy',
      exercise: { id: 2, slug: 'legacy', name: 'Legacy', imageUrl: 'https://example.test/image.jpg' } })
    const fallback = exerciseHero(remote) as unknown as Element
    assert.equal(fallback.querySelector('img'), null)
    assert.equal(fallback.children.length, 1)
    assert.equal(fallback.children[0].textContent, 'Legacy')
  } finally {
    globalThis.document = originalDocument
    globalThis.localStorage = originalStorage
  }
})
