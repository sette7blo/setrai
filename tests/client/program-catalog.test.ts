import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeProgramCatalog } from '../../src/client/workouts/program-catalog.js'
import { normalizeProgram } from '../../src/client/workouts/format.js'
import { reviewCatalogProgram, updateCatalogProgram } from '../../src/client/workouts/discovery-api.js'
import { ApiClient } from '../../src/client/shared/api/client.js'

test('workout catalog deduplicates by address while preserving local edits and ordering Local, Update, Web', () => {
  const local = normalizeProgram({ id: 1, slug: 'edited', name: 'My edited workout', nostrAddress: '33402:a:test', nostrEventId: 'old' })
  const latest = { ...local, id: 0, localId: 1, name: 'Latest relay workout', nostrEventId: 'new', updateAvailable: true }
  const web = { ...local, id: 0, localId: null, nostrAddress: '33402:b:test', name: 'Community workout' }
  const merged = mergeProgramCatalog([local], [latest, web, web])
  assert.equal(merged.length, 2)
  assert.equal(merged[0].program.name, 'My edited workout')
  assert.equal(merged[0].status, 'Update')
  assert.equal(merged[1].status, 'Web')
  assert.equal(mergeProgramCatalog([local], [])[0].status, 'Local')
  assert.equal(mergeProgramCatalog([local], [{ ...latest, localId: null }]).length, 1)
  const anotherLocal = { ...local, id: 2, name: 'Z local', nostrAddress: null }
  const firstLocal = { ...anotherLocal, id: 3, name: 'B local' }
  const earlierWeb = { ...web, nostrAddress: '33402:c:test', name: 'A web' }
  const ordered = mergeProgramCatalog([local, anotherLocal, firstLocal], [web, latest, earlierWeb])
  assert.deepEqual(ordered.map(card => [card.status, card.program.name]), [
    ['Local', 'B local'], ['Local', 'Z local'], ['Update', 'My edited workout'],
    ['Web', 'A web'], ['Web', 'Community workout']
  ])
})

test('review is read-only and applying an update sends only the verified event identifier', async () => {
  const original = globalThis.fetch
  const calls: { path: string; method: string; body: unknown }[] = []
  try {
    globalThis.fetch = (async (url, options) => {
      calls.push({ path: String(url), method: options?.method ?? 'GET', body: options?.body ? JSON.parse(String(options.body)) : null })
      return Response.json(options?.method === 'POST' ? { program: { id: 1, name: 'Saved', slug: 'saved' } } : { review: { legacy: false, fields: [] } })
    }) as typeof fetch
    const id = 'a'.repeat(64)
    const client = new ApiClient()
    await reviewCatalogProgram(id, client)
    await updateCatalogProgram(id, client)
    assert.equal(calls[0].method, 'GET')
    assert.match(calls[0].path, /\/review\?eventId=/)
    assert.equal(calls[1].method, 'POST')
    assert.deepEqual(calls[1].body, { eventId: id })
  } finally { globalThis.fetch = original }
})
