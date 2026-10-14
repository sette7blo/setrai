import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { loadCatalog, importCatalogExercise } from '../../src/client/exercises/catalog-api.js'

const root = process.cwd()

test('Discover product UI is gone; catalog API lives under exercises', () => {
  assert.equal(fs.existsSync(path.join(root, 'src/client/discover')), false)
  assert.equal(fs.existsSync(path.join(root, 'src/client/exercises/catalog-api.ts')), true)
  assert.equal(fs.existsSync(path.join(root, 'src/client/exercises/tabs.ts')), false)
  assert.equal(fs.existsSync(path.join(root, 'src/client/discover/page.ts')), false)
  assert.equal(fs.existsSync(path.join(root, 'src/client/discover/card.ts')), false)
  assert.equal(fs.existsSync(path.join(root, 'src/client/discover/styles.css')), false)

  const main = fs.readFileSync(path.join(root, 'src/client/app/main.ts'), 'utf8')
  assert.doesNotMatch(main, /discover\/styles\.css/)

  const application = fs.readFileSync(path.join(root, 'src/client/app/application.ts'), 'utf8')
  assert.doesNotMatch(application, /renderDiscoverPage/)
  assert.doesNotMatch(application, /discover\/api/)
  assert.match(application, /exercises\/catalog-api/)
  assert.match(application, /\/exercises\/discover/)
  assert.match(application, /loadCatalog/)
  assert.match(application, /importCatalogExercise/)
})

test('catalog normalizes external image and import sends only the verified event ID', async () => {
  const original = globalThis.fetch
  const calls: Array<{ url: string, body: string | undefined }> = []
  const payload = {
    id: 12,
    slug: 'pushups',
    name: 'Pushups',
    image_url: 'https://i.nostr.build/example.png',
    instructions: ['Lower', 'Press'],
    nostr_event_id: 'a'.repeat(64),
    nostr_address: '33401:author:exercise',
    localId: 12,
  }
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
  } finally {
    globalThis.fetch = original
  }
})
