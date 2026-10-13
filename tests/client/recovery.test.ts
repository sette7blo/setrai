import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeRecovery, recoveryPercent, sortedRecovery, statusLabel, lastTrainedText } from '../../src/client/recovery/format.js'
import { recoveryBodyMapMarkup, recoveryContent, recoveryHero, recoveryMapControls, recoveryPartition } from '../../src/client/recovery/page.js'

test('normalizes Recovery API payload', () => {
  const recovery = normalizeRecovery({ generatedAt: 'now', lookbackDays: 7, muscles: [{ muscle: 'chest', recovery: 0.82, status: 'ready', lastTrainedAt: '2026-10-03T00:00:00.000Z' }] })
  assert.equal(recovery.muscles[0].muscle, 'chest')
  assert.equal(recovery.muscles[0].recovery, 0.82)
})

test('formats Recovery percent and statuses', () => {
  assert.equal(recoveryPercent(0.82), '82%')
  assert.equal(statusLabel('ready'), 'Ready')
  assert.equal(statusLabel('moderate'), 'Moderate')
  assert.equal(statusLabel('recovering'), 'Recovering')
})

test('sorts Recovery presentation by lowest recovery first', () => {
  const sorted = sortedRecovery([
    { muscle: 'chest', recovery: 0.82, status: 'ready', lastTrainedAt: '' },
    { muscle: 'back', recovery: 0.22, status: 'recovering', lastTrainedAt: '' }
  ])
  assert.equal(sorted[0].muscle, 'back')
})

test('formats last-trained helper and empty state shape', () => {
  assert.equal(normalizeRecovery({ muscles: [] }).muscles.length, 0)
  assert.equal(lastTrainedText(''), 'No recent training date')
})

test('Recovery body map colors muscles by status and leaves untrained muscles fresh', () => {
  const markup = recoveryBodyMapMarkup({ generatedAt: '', lookbackDays: 7, muscles: [
    { muscle: 'chest', recovery: 0.9, status: 'ready', lastTrainedAt: '' },
    { muscle: 'back', recovery: 0.5, status: 'moderate', lastTrainedAt: '' },
    { muscle: 'calves', recovery: 0.2, status: 'recovering', lastTrainedAt: '' }
  ] })
  assert.match(markup, /id="recovery-body"/)
  assert.match(markup, /class="recovery-map__ready"/)
  assert.doesNotMatch(markup, /tabindex|role="button"/)
  assert.match(markup, /aria-hidden="true"/)
  assert.match(markup, /class="recovery-map__moderate"/)
  assert.match(markup, /class="recovery-map__recovering"/)
  assert.match(markup, /class="recovery-map__fresh"/)
})

class TestElement {
  className = ''
  textContent = ''
  innerHTML = ''
  type = ''
  dataset: Record<string, string> = {}
  attributes: Record<string, string> = {}
  children: TestElement[] = []
  listeners: Record<string, Array<(event: KeyboardEvent) => void>> = {}
  classList = { toggle: () => {} }
  append(...children: TestElement[]): void { this.children.push(...children) }
  appendChild(child: TestElement): TestElement { this.children.push(child); return child }
  setAttribute(name: string, value: string): void { this.attributes[name] = value }
  querySelectorAll(): TestElement[] { return [] }
  addEventListener(name: string, handler: (event: KeyboardEvent) => void): void { (this.listeners[name] ??= []).push(handler) }
  dispatch(name: string, event = {} as KeyboardEvent): void { for (const handler of this.listeners[name] ?? []) handler(event) }
}

function text(root: TestElement): string {
  return [root.textContent, ...root.children.map(text)].join(' ')
}

test('Recovery hero is compact and uses status metrics instead of explanatory copy', () => {
  const originalDocument = globalThis.document
  try {
    globalThis.document = {
      createElement: () => new TestElement(),
      createElementNS: () => new TestElement(),
      createTextNode: (value: string) => Object.assign(new TestElement(), { textContent: value })
    } as unknown as Document
    const hero = recoveryHero({ generatedAt: '', lookbackDays: 7, muscles: [
      { muscle: 'chest', recovery: 0.8, status: 'ready', lastTrainedAt: '' },
      { muscle: 'back', recovery: 0.5, status: 'moderate', lastTrainedAt: '' },
      { muscle: 'triceps', recovery: 0.2, status: 'recovering', lastTrainedAt: '' }
    ] }) as unknown as TestElement
    const rendered = text(hero)
    assert.match(hero.className, /program-browse-hero/)
    assert.match(hero.className, /recovery-hero--compact/)
    assert.match(rendered, /Muscle readiness/)
    assert.match(rendered, /85% overall recovery/)
    assert.match(rendered, /1 ready/)
    assert.match(rendered, /7 fresh/)
    assert.match(rendered, /1 moderate/)
    assert.match(rendered, /1 recovering/)
    assert.doesNotMatch(rendered, /Training-readiness estimates/)
  } finally {
    globalThis.document = originalDocument
  }
})

test('Recovery map uses the least ready muscle when aliases share a region, regardless of input order', () => {
  const muscles = [
    { muscle: 'anterior-deltoid', recovery: .2, status: 'recovering' as const, lastTrainedAt: '' },
    { muscle: 'posterior-deltoid', recovery: 1, status: 'ready' as const, lastTrainedAt: '' }
  ]
  for (const entries of [muscles, [...muscles].reverse()]) {
    const markup = recoveryBodyMapMarkup({ generatedAt: '', lookbackDays: 7, muscles: entries })
    assert.match(markup, /class="recovery-map__recovering"/)
    assert.doesNotMatch(markup, /class="recovery-map__ready"/)
  }
})

test('Recovery content uses one canonical partition and map controls support click, Enter, and Space', () => {
  const originalDocument = globalThis.document
  try {
    globalThis.document = {
      createElement: () => new TestElement(),
      createElementNS: () => new TestElement(),
      createTextNode: (value: string) => Object.assign(new TestElement(), { textContent: value })
    } as unknown as Document
    const recovery = { generatedAt: '', lookbackDays: 7, muscles: [
      { muscle: 'chest', recovery: .9, status: 'ready' as const, lastTrainedAt: '' },
      { muscle: 'back', recovery: .5, status: 'moderate' as const, lastTrainedAt: '' },
      { muscle: 'triceps', recovery: .2, status: 'recovering' as const, lastTrainedAt: '' }
    ] }
    assert.deepEqual(recoveryPartition(recovery).counts, { fresh: 7, ready: 1, moderate: 1, recovering: 1 })
    const content = recoveryContent(recovery) as unknown as TestElement
    const rendered = text(content)
    assert.match(rendered, /1 muscles ready/)
    assert.match(rendered, /7 muscles fresh/)
    assert.match(rendered, /1 muscles moderate/)
    assert.match(rendered, /1 muscles recovering/)
    const selected: string[] = []
    const controls = recoveryMapControls(recovery, muscle => selected.push(muscle)) as unknown as TestElement
    const chest = controls.children.find(button => button.dataset.muscle === 'Chest')!
    chest.dispatch('click')
    chest.dispatch('keydown', { key: 'Enter', preventDefault() {} } as KeyboardEvent)
    chest.dispatch('keydown', { key: ' ', preventDefault() {} } as KeyboardEvent)
    assert.deepEqual(selected, ['Chest', 'Chest', 'Chest'])
  } finally { globalThis.document = originalDocument }
})
