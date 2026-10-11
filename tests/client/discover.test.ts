import assert from 'node:assert/strict'
import test from 'node:test'
import { exerciseTabsMarkup } from '../../src/client/exercises/tabs.js'
import { loadCatalog, importCatalogExercise } from '../../src/client/discover/api.js'
import { discoverHero } from '../../src/client/discover/page.js'

test('Discover tab is actionable only when the optional capability is enabled', () => {
  assert.match(exerciseTabsMarkup('library', true), /href="\/exercises\/discover"/)
  assert.doesNotMatch(exerciseTabsMarkup('library', false), /href="\/exercises\/discover"/)
  assert.match(exerciseTabsMarkup('discover', true), /exercise-tab--active" href="\/exercises\/discover" aria-current="page"/)
})

test('catalog normalizes external image and import sends only the verified event ID', async () => {
  const original = globalThis.fetch
  const calls: Array<{url: string, body: string | undefined}> = []
  const payload = { id: 12, slug: 'pushups', name: 'Pushups', image_url: 'https://i.nostr.build/example.png', instructions: ['Lower', 'Press'], nostr_event_id: 'a'.repeat(64), nostr_address: '33401:author:exercise', localId: 12 }
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), body: init?.body as string | undefined })
      return new Response(JSON.stringify(init?.method === 'POST' ? { exercise: payload } : { exercises: [payload] }))
    }
    const catalog = await loadCatalog()
    assert.equal(catalog[0].exercise.imageUrl, payload.image_url)
    assert.deepEqual(catalog[0].exercise.instructions, ['Lower', 'Press'])
    assert.equal(catalog[0].localId, 12)
    assert.equal((await importCatalogExercise(payload.nostr_event_id)).id, 12)
    assert.deepEqual(JSON.parse(calls[1].body!), { eventId: payload.nostr_event_id })
  } finally { globalThis.fetch = original }
})

test('Discover hero is branded as Setrai catalogue', () => {
  const originalDocument = globalThis.document
  class El {
    textContent = ''
    className = ''
    id = ''
    children: El[] = []
    append(...children: (El | string)[]): void { this.children.push(...children.filter((child): child is El => typeof child !== 'string')) }
    appendChild(child: El): El { this.children.push(child); return child }
    querySelector(): El | null { return null }
    setAttribute(): void {}
  }
  globalThis.document = {
    createElement: () => new El() as unknown as HTMLElement,
    createElementNS: () => new El() as unknown as SVGElement,
    createTextNode: (text: string) => Object.assign(new El(), { textContent: text }) as unknown as Text
  } as unknown as Document
  try {
    const hero = discoverHero('Ready') as unknown as El
    const text = JSON.stringify(hero)
    assert.match(text, /Setrai catalogue/)
    assert.match(text, /library-summary-card/)
    assert.match(text, /library-summary-icon/)
    assert.match(text, /library-summary-metrics/)
    assert.doesNotMatch(text, /Workstr catalog/)
  } finally {
    globalThis.document = originalDocument
  }
})
