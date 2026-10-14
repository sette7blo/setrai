import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeExercise } from '../../src/client/exercises/format.js'
import { catalogEntry, exerciseStatus, mergeExerciseCatalog, statusLabel, type CatalogEntry } from '../../src/client/exercises/catalog.js'
import { filterExercises } from '../../src/client/exercises/filters.js'
import { importCatalogExercise } from '../../src/client/exercises/catalog-api.js'

test('merged list keeps all local exercises first and deduplicates by provenance, not title', () => {
  const local = [normalizeExercise({ id: 3, slug: 'squat', name: 'My squat', favourite: true }),
    normalizeExercise({ id: 4, slug: 'press', name: 'Press' })]
  const catalog: CatalogEntry[] = [
    { exercise: normalizeExercise({ id: 0, slug: 'squat', name: 'Squat' }), eventId: 'a', address: 'squat', localId: 3, updateAvailable: true },
    { exercise: normalizeExercise({ id: 0, slug: 'press', name: 'Press', equipment: ['barbell'] }), eventId: 'b', address: 'press', localId: null }
  ]
  const merged = mergeExerciseCatalog(local, catalog)
  assert.deepEqual(merged.map(item => item.name), ['My squat', 'Press', 'Press'])
  assert.deepEqual(merged.map(item => exerciseStatus(item, catalogEntry(item, catalog, local))), ['Update', 'Local', 'Web'])
  assert.equal(catalogEntry(merged[2], catalog, local)?.eventId, 'b')
  assert.equal(filterExercises(merged, { search: '', favouritesOnly: true, muscle: '', equipment: '', difficulty: '' }).length, 1)
  assert.equal(filterExercises(merged, { search: '', favouritesOnly: false, muscle: '', equipment: 'barbell', difficulty: '' })[0].id, -1)
  assert.deepEqual(mergeExerciseCatalog(local, []), local)
})

test('reviewed update calls its own endpoint with only the verified event ID', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), '/api/nostr/exercises/update')
      assert.deepEqual(JSON.parse(init?.body as string), { eventId: 'a'.repeat(64) })
      return new Response(JSON.stringify({ exercise: { id: 3, name: 'Squat' } }))
    }
    assert.equal((await importCatalogExercise('a'.repeat(64), true)).id, 3)
  } finally { globalThis.fetch = original }
})

test('explicit image replacement sends an option, never an unverified image URL', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), '/api/nostr/exercises/update')
      assert.deepEqual(JSON.parse(init?.body as string), { eventId: 'a'.repeat(64), replaceImage: true })
      return new Response(JSON.stringify({ exercise: { id: 3, name: 'Squat' } }))
    }
    await importCatalogExercise('a'.repeat(64), true, true)
  } finally { globalThis.fetch = original }
})

test('Update strip is an actionable button; Local and Web remain status text', () => {
  const original = globalThis.document
  class Element {
    type = ''; disabled = false; className = ''; textContent = ''
    click?: () => void
    constructor(public tag: string) {}
    addEventListener(event: string, callback: () => void): void { if (event === 'click') this.click = callback }
  }
  globalThis.document = { createElement: (tag: string) => new Element(tag) } as unknown as Document
  try {
    let clicks = 0
    const update = statusLabel('Update', () => { clicks++ }) as unknown as Element
    assert.equal(update.tag, 'button')
    assert.equal(update.type, 'button')
    assert.equal(update.textContent, 'Update')
    update.click!()
    assert.equal(clicks, 1)
    assert.equal((statusLabel('Update', () => {}, true) as unknown as Element).disabled, true)
    assert.equal((statusLabel('Local') as unknown as Element).tag, 'span')
    assert.equal((statusLabel('Web') as unknown as Element).tag, 'span')
  } finally { globalThis.document = original }
})
