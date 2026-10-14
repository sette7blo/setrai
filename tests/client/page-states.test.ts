import assert from 'node:assert/strict'
import test from 'node:test'

import { bindPageRetry, pageEmpty, pageError, pageLoading } from '../../src/client/shared/page-states.js'

class TestElement {
  tagName = ''
  className = ''
  textContent = ''
  children: TestElement[] = []
  attributes: Record<string, string> = {}
  dataset: Record<string, string> = {}
  listeners: Record<string, Array<() => void>> = {}
  type = ''
  href = ''

  constructor(tag = 'div') {
    this.tagName = tag
  }

  append(...nodes: TestElement[]): void {
    this.children.push(...nodes)
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  querySelectorAll(selector: string): TestElement[] {
    const match = (node: TestElement): boolean => {
      if (selector === '[data-retry]') return Object.prototype.hasOwnProperty.call(node.dataset, 'retry')
      return false
    }
    const walk = (node: TestElement): TestElement[] => [
      ...(match(node) ? [node] : []),
      ...node.children.flatMap(walk),
    ]
    return walk(this)
  }

  querySelector(selector: string): TestElement | null {
    return this.querySelectorAll(selector)[0] ?? null
  }

  addEventListener(name: string, handler: () => void): void {
    ;(this.listeners[name] ??= []).push(handler)
  }

  click(): void {
    for (const handler of this.listeners.click ?? []) handler()
  }

  replaceWith(node: TestElement): void {
    Object.assign(this, node)
  }
}

function withDom(run: () => void): void {
  const original = globalThis.document
  globalThis.document = {
    createElement: (tag: string) => new TestElement(tag),
    createTextNode: (text: string) => Object.assign(new TestElement('#text'), { textContent: text }),
  } as unknown as Document
  try {
    run()
  } finally {
    globalThis.document = original
  }
}

function texts(root: TestElement): string {
  return [root.textContent, ...root.children.map(texts)].filter(Boolean).join(' ')
}

test('pageError builds shared unavailable chrome with retry', () => {
  withDom(() => {
    const view = pageError({
      eyebrow: 'Home',
      title: 'Home unavailable',
      message: 'offline',
      className: 'stats-empty',
    }) as unknown as TestElement
    assert.match(view.className, /page-state--error/)
    assert.match(view.className, /stats-empty/)
    assert.equal(view.attributes.role, 'alert')
    assert.match(texts(view), /Home unavailable/)
    assert.match(texts(view), /offline/)
    assert.match(texts(view), /Try again/)
    let clicks = 0
    bindPageRetry(view as unknown as HTMLElement, () => { clicks += 1 })
    const retry = view.querySelectorAll('[data-retry]')[0]
    assert.ok(retry)
    retry.click()
    assert.equal(clicks, 1)
  })
})

test('pageEmpty supports compact list empties and linked CTAs', () => {
  withDom(() => {
    const empty = pageEmpty({
      title: 'No workout history yet.',
      description: 'Start training to fill this timeline.',
      action: { label: 'Open Recovery', href: '/workouts/recovery' },
      compact: true,
      className: 'workout-browser-empty',
    }) as unknown as TestElement
    assert.match(empty.className, /page-state--compact/)
    assert.match(empty.className, /workout-browser-empty/)
    assert.match(texts(empty), /No workout history yet/)
    const link = empty.children.find((child) => child.href === '/workouts/recovery')
    assert.ok(link)
    assert.match(link!.className, /button--primary/)
  })
})

test('pageLoading renders pulse blocks', () => {
  withDom(() => {
    const loading = pageLoading({ blocks: 2, label: 'Loading home', className: 'statistics-page--loading' }) as unknown as TestElement
    assert.match(loading.className, /page-state--loading/)
    assert.equal(loading.attributes['aria-busy'], 'true')
    assert.equal(loading.attributes['aria-label'], 'Loading home')
    assert.equal(loading.children.length, 2)
    assert.equal(loading.children.every((child) => child.className === 'page-state-block'), true)
  })
})
