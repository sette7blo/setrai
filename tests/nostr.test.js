import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { exerciseFromEvent, selectExercises } from '../src/server/nostr/exercise-event.js'
import { queryRelay } from '../src/server/nostr/relay-query.js'
import { createDiscoveryService } from '../src/server/nostr/discovery-service.js'
import { createDiscoveryRoutes } from '../src/server/nostr/routes.js'
import { parseNostrRelays, WORKSTR_RELAYS } from '../src/server/config/nostr-relays.js'
import { openDatabase } from '../src/server/db/connection.js'
import { createExerciseService } from '../src/server/exercises/service.js'

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/workstr-exercise.json', import.meta.url)))
const event = () => structuredClone(fixture)

test('verifies signed official exercise and preserves artwork, instructions and provenance', () => {
  const parsed = exerciseFromEvent(event())
  assert.ok(parsed)
  assert.match(parsed.image_url, /^https:\/\/i\.nostr\.build\//)
  assert.ok(parsed.instructions.length)
  assert.equal(parsed.movement_type, 'compound')
  assert.equal(parsed.nostr_event_id, fixture.id)
  assert.match(parsed.nostr_address, /^33401:/)
  assert.equal(selectExercises([event(), event()]).length, 1)
})

test('rejects tampering, wrong authors/kinds, malformed and oversized events', () => {
  assert.equal(exerciseFromEvent({ ...event(), content: 'Changed' }), null)
  assert.equal(exerciseFromEvent({ ...event(), pubkey: '0'.repeat(64) }), null)
  assert.equal(exerciseFromEvent({ ...event(), kind: 1 }), null)
  assert.equal(exerciseFromEvent({ ...event(), tags: [['title', {}]] }), null)
  assert.equal(exerciseFromEvent({ ...event(), content: 'x'.repeat(100001) }), null)
  assert.equal(exerciseFromEvent(null), null)
  // Invalid copies of a legitimate ID must not hide the verified original.
  assert.equal(selectExercises([{ ...event(), content: 'bad' }, event()]).length, 1)
})

test('relay defaults match Workstr canon and secure overrides are validated', () => {
  assert.deepEqual(parseNostrRelays(''), WORKSTR_RELAYS)
  assert.deepEqual(parseNostrRelays(' wss://nos.lol , wss://nos.lol '), ['wss://nos.lol'])
  assert.throws(() => parseNostrRelays('http://example.com'), /secure WebSocket/)
  assert.throws(() => parseNostrRelays('wss://name:secret@example.com'), /secure WebSocket/)
})

test('discovery caches partial relay success; imports persist and duplicate imports preserve edits', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-nostr-'))
  let db = openDatabase(path.join(directory, 'test.db'))
  try {
    let calls = 0
    let exercises = createExerciseService(db)
    const source = exerciseFromEvent(event())
    const original = exercises.createExercise({ ...source, source_type: 'builtin', nostr_address: null })
    const discovery = createDiscoveryService({ relays: ['good', 'bad'] }, exercises, async relay => {
      calls++
      if (relay === 'bad') throw new Error('offline')
      return [event()]
    })
    const catalog = await discovery.listExercises()
    assert.equal(catalog.exercises.length, 1)
    assert.equal(catalog.unavailableRelays, 1)
    await discovery.listExercises()
    assert.equal(calls, 2)
    const imported = await discovery.importExercise(fixture.id)
    assert.equal(imported.created, true)
    assert.notEqual(imported.exercise.slug, original.slug)
    assert.equal(imported.exercise.image_url, source.image_url)
    assert.equal(imported.exercise.nostr_address, source.nostr_address)
    exercises.updateExercise(imported.exercise.id, { name: 'My local edit', favourite: true })
    const repeated = await discovery.importExercise(fixture.id)
    assert.equal(repeated.created, false)
    assert.equal(repeated.exercise.name, 'My local edit')
    assert.equal(repeated.exercise.favourite, true)
    assert.equal((await discovery.listExercises()).exercises[0].localId, imported.exercise.id)
    db.close()
    db = openDatabase(path.join(directory, 'test.db'))
    exercises = createExerciseService(db)
    assert.equal(exercises.getExercise(imported.exercise.id).nostr_event_id, fixture.id)
    assert.deepEqual(exercises.getExercise(imported.exercise.id).instructions, source.instructions)
  } finally { db.close(); fs.rmSync(directory, { recursive: true, force: true }) }
})

test('all-relay failures report a safe error and do not write exercises', async () => {
  let written = false
  const service = createDiscoveryService({ relays: ['offline'] }, {
    listExercises: () => [], importDiscoveredExercise: () => { written = true }
  }, async () => { throw new Error('external failure') })
  await assert.rejects(service.listExercises(), error => error.statusCode === 503)
  assert.equal(written, false)
})

test('relay query ends at EOSE and closes the subscription', async () => {
  let socket
  class Socket {
    readyState = 1
    listeners = {}
    sent = []
    constructor() { socket = this; queueMicrotask(() => this.listeners.open()) }
    addEventListener(name, callback) { this.listeners[name] = callback }
    send(data) {
      const frame = JSON.parse(data)
      this.sent.push(frame)
      if (frame[0] === 'REQ') queueMicrotask(() => {
        this.listeners.message({ data: JSON.stringify(['EVENT', frame[1], event()]) })
        this.listeners.message({ data: JSON.stringify(['EOSE', frame[1]]) })
      })
    }
    close() { this.readyState = 3 }
  }
  assert.equal((await queryRelay('test', { limit: 500 }, { Socket })).length, 1)
  assert.equal(socket.sent.at(-1)[0], 'CLOSE')
  assert.equal(socket.readyState, 3)
})

test('import HTTP route validates IDs; disabled discovery does not invoke services', async () => {
  let calls = 0
  const routes = createDiscoveryRoutes({ importExercise: async () => { calls++; return { exercise: {}, created: true } } })
  const server = http.createServer(async (req, res) => {
    try { await routes.handle(req, res, new URL(req.url, 'http://localhost')) }
    catch (error) { res.writeHead(error.statusCode); res.end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/nostr/exercises/import`
    assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: 'forged' }) })).status, 400)
    assert.equal(calls, 0)
    assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: fixture.id }) })).status, 201)
    assert.equal(calls, 1)
    let status
    await createDiscoveryRoutes(null).handle({ method: 'GET' }, {
      writeHead: value => { status = value }, end: () => {}
    }, new URL('http://localhost/api/nostr/exercises'))
    assert.equal(status, 404)
  } finally { await new Promise(resolve => server.close(resolve)) }
})

test('Workstr optional null tags are omitted while verified image and instructions remain', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/workstr-null-tag-exercise.json', import.meta.url)))
  const exercise = exerciseFromEvent(fixture)
  assert.ok(exercise)
  assert.deepEqual(exercise.tags, ['static'])
  assert.equal(exercise.equipment[0], 'bodyweight')
  assert.ok(exercise.image_url.startsWith('https://'))
  assert.ok(exercise.instructions.length)
})
