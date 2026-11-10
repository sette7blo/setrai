import assert from 'node:assert/strict'
import test from 'node:test'

import { bindPageRetry, loadingRegion, pageEmpty, pageError, showLoadingAfterDelay, skeleton } from '../../src/client/shared/page-states.js'

class TestElement {
  tagName = ''
  className = ''
  textContent = ''
  children: TestElement[] = []
  attributes: Record<string, string> = {}
  style: Record<string, string> = {}
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

test('skeleton blocks compose into one announced loading region', () => {
  withDom(() => {
    const block = skeleton({ height: 75, radius: 'md', className: 'stats-card--records' }) as unknown as TestElement
    assert.equal(block.className, 'skeleton skeleton--md stats-card--records')
    assert.equal(block.attributes['aria-hidden'], 'true')
    assert.equal(block.style.height, '75px')
    assert.equal((skeleton({ aspect: '4 / 3' }) as unknown as TestElement).style.aspectRatio, '4 / 3')

    const region = loadingRegion('Loading home', 'today-page', block as unknown as HTMLElement, skeleton() as unknown as HTMLElement) as unknown as TestElement
    assert.equal(region.className, 'today-page')
    assert.equal(region.attributes['aria-busy'], 'true')
    const announced = region.children.filter(child => child.attributes.role === 'status')
    assert.equal(announced.length, 1)
    assert.equal(announced[0].textContent, 'Loading home')
    assert.equal(region.children.length, 3)
  })
})

test('a placeholder appears only when loading outlasts the delay', async () => {
  const shown: string[] = []
  const root = { replaceChildren: (node: { name: string }) => { shown.push(node.name) } } as unknown as HTMLElement
  const fast = showLoadingAfterDelay(root, () => ({ name: 'fast' }) as unknown as HTMLElement, 20)
  fast()
  showLoadingAfterDelay(root, () => ({ name: 'slow' }) as unknown as HTMLElement, 20)
  await new Promise(resolve => setTimeout(resolve, 60))
  assert.deepEqual(shown, ['slow'])
})
