import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { finalizeEvent } from 'nostr-tools/pure'
import { programFromEvent, selectPrograms } from '../src/server/nostr/program-event.js'
import { createProgramDiscovery } from '../src/server/nostr/program-discovery.js'
import { createDiscoveryRoutes } from '../src/server/nostr/routes.js'
import { createProgramService } from '../src/server/programs/service.js'
import { createExerciseService } from '../src/server/exercises/service.js'
import { openDatabase } from '../src/server/db/connection.js'

const official = JSON.parse(fs.readFileSync(new URL('./fixtures/workstr-program.json', import.meta.url)))
const creator = JSON.parse(fs.readFileSync(new URL('./fixtures/workstr-creator-program.json', import.meta.url)))
function signed(overrides = {}) {
  return finalizeEvent({ kind: 33402, created_at: 1700000000, content: '',
    tags: [['d', 'workstr:beastmode:program:test'], ['title', 'Test'], ['t', 'workstr'], ['t', 'beastmode'], ['t', 'workstr-program'],
      ['workstr_meta', JSON.stringify({ exercises: [{ address: 'workstr:exercise:pushup', name: 'Pushup', sets: 3 }] })]], ...overrides }, new Uint8Array(32).fill(2))
}

test('verifies official and creator programs, retaining timed structure and deduplicating addresses', () => {
  const program = programFromEvent(official)
  assert.ok(program)
  assert.equal(program.sourceLabel, 'Workstr')
  const remote = programFromEvent(creator)
  assert.equal(remote.sourceLabel, 'Creator')
  assert.equal(remote.blocks.length, 2)
  assert.equal(remote.blocks[0].intervals[0].steps[0].targetDurationSec, 30)
  assert.equal(selectPrograms([official, official, creator]).length, 2)
  const newer = signed({ created_at: 1700000001 })
  assert.equal(selectPrograms([signed(), newer])[0].eventId, newer.id)
})

test('rejects tampered, foreign official, malformed, oversized and unsafe programs', () => {
  assert.equal(programFromEvent({ ...official, content: 'tampered' }), null)
  assert.equal(programFromEvent({ ...creator, kind: 1 }), null)
  assert.equal(programFromEvent({ ...creator, tags: [['title', {}]] }), null)
  assert.equal(programFromEvent({ ...creator, content: 'x'.repeat(100001) }), null)
  assert.equal(programFromEvent(signed({ tags: [['d', 'workstr:program:fake'], ['title', 'Fake']] })), null)
  for (const bad of [
    { address: 'https://example.com', name: 'Invalid' },
    { address: 'workstr:exercise:pushup', sets: -3 },
    { address: 'workstr:exercise:pushup', imageUrl: 'javascript:alert(1)' },
    { address: 'workstr:exercise:pushup', weight: 'Infinity' }
  ]) {
    const event = signed()
    const tags = event.tags.map(tag => tag[0] === 'workstr_meta' ? ['workstr_meta', JSON.stringify({ exercises: [bad] })] : tag)
    assert.equal(programFromEvent(signed({ tags })), null)
  }
  assert.equal(selectPrograms([{ ...official, content: 'tampered' }, official]).length, 1)
})

test('timed Workstr programs with empty reps remain valid', () => {
  const event = signed()
  const tags = event.tags.map(tag => tag[0] === 'workstr_meta' ? ['workstr_meta', JSON.stringify({
    exercises: [{ address: 'workstr:exercise:plank', name: 'Plank', reps: '' }],
    blocks: [{ type: 'emom', rounds: 3, intervals: [{ durationSec: 60, steps: [{ exerciseSlug: 'plank', targetDurationSec: 40 }] }] }]
  })] : tag)
  const program = programFromEvent(signed({ tags }))
  assert.ok(program)
  assert.equal(program.blocks[0].totalDurationSec, 180)
})

test('program discovery caches partial success and imports exercise references into a durable local program', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-program-discover-'))
  const filename = path.join(directory, 'test.db')
  let db = openDatabase(filename)
  try {
    const programs = createProgramService(db)
    const exercises = createExerciseService(db)
    const source = programFromEvent(creator)
    const collision = programs.createProgram({ name: source.name, slug: source.slug })
    let calls = 0
    const query = async relay => { calls++; if (relay === 'bad') throw new Error('Offline'); return [creator] }
    const discovery = createProgramDiscovery({ relays: ['good', 'bad'] }, programs, { listExercises: async () => ({ exercises: [] }) }, query)
    const result = await discovery.listPrograms()
    assert.equal(result.programs.length, 1)
    assert.equal(result.unavailableRelays, 2)
    await discovery.listPrograms()
    assert.equal(calls, 4)
    const imported = await discovery.importProgram(creator.id)
    assert.equal(imported.created, true)
    assert.notEqual(imported.program.slug, collision.slug)
    assert.equal(imported.program.nostrAddress, source.address)
    assert.equal(imported.program.exercises.length, source.exercises.length)
    assert.deepEqual(imported.program.blocks, source.blocks)
    assert.ok(imported.program.exercises.every(entry => exercises.getExercise(entry.exerciseId)))
    const count = exercises.getExerciseCount()
    programs.updateProgram(imported.program.id, { name: 'My edit' })
    const repeated = await discovery.importProgram(creator.id)
    assert.equal(repeated.created, false)
    assert.equal(repeated.program.name, 'My edit')
    assert.equal(exercises.getExerciseCount(), count)
    assert.equal((await discovery.listPrograms()).programs[0].localId, imported.program.id)
    const copy = programs.duplicateProgram(imported.program.id)
    assert.equal(copy.nostrAddress, null)
    assert.deepEqual(copy.blocks, imported.program.blocks)
    db.close()
    db = openDatabase(filename)
    assert.equal(createProgramService(db).getProgram(imported.program.id).nostrEventId, creator.id)
  } finally { db.close(); fs.rmSync(directory, { recursive: true, force: true }) }
})

test('program import rolls back missing exercise writes on failure', () => {
  const db = openDatabase(':memory:')
  try {
    const programs = createProgramService(db)
    const input = programFromEvent(creator)
    // A broken second reference simulates a persistence failure after the first write.
    input.exercises[1].address = null
    assert.throws(() => programs.importDiscoveredProgram(input, []))
    assert.equal(createExerciseService(db).getExerciseCount(), 0)
    assert.equal(programs.getProgramCount(), 0)
  } finally { db.close() }
})

test('all relay failures and unknown imports return safe errors', async () => {
  const programs = { listPrograms: () => [], importDiscoveredProgram: () => assert.fail('Must not write') }
  const exercises = { listExercises: async () => ({ exercises: [] }) }
  const offline = createProgramDiscovery({ relays: ['offline'] }, programs, exercises, async () => { throw new Error('external credentials') })
  await assert.rejects(offline.listPrograms(), error => error.statusCode === 503 && !error.message.includes('credentials'))
  const empty = createProgramDiscovery({ relays: ['online'] }, programs, exercises, async () => [])
  await assert.rejects(empty.importProgram('0'.repeat(64)), error => error.statusCode === 404)
})

test('disabled program Discover rejects requests without invoking a service', async () => {
  let status
  await createDiscoveryRoutes(null).handle({ method: 'GET' }, { writeHead: value => { status = value }, end() {} }, new URL('http://localhost/api/nostr/programs'))
  assert.equal(status, 404)
})

test('program import HTTP route accepts only JSON event IDs from the verified catalog', async () => {
  let calls = 0
  const routes = createDiscoveryRoutes(null, {
    importProgram: async eventId => { calls++; assert.equal(eventId, creator.id); return { program: { id: 1 }, created: true } }
  })
  const server = http.createServer(async (req, res) => {
    try { await routes.handle(req, res, new URL(req.url, 'http://localhost')) }
    catch (error) { res.writeHead(error.statusCode || 500); res.end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/nostr/programs/import`
    const post = (body, contentType = 'application/json') => fetch(url, { method: 'POST', headers: { 'Content-Type': contentType }, body })
    assert.equal((await post(JSON.stringify({ eventId: 'forged' }))).status, 400)
    assert.equal((await post('x'.repeat(3000))).status, 413)
    assert.equal((await post(JSON.stringify({ eventId: creator.id }), 'text/plain')).status, 415)
    assert.equal(calls, 0)
    assert.equal((await post(JSON.stringify({ eventId: creator.id, name: 'Untrusted client metadata' }))).status, 201)
    assert.equal(calls, 1)
  } finally { await new Promise(resolve => server.close(resolve)) }
})

test('program builder service validates prescriptions before writes', () => {
  const db = openDatabase(':memory:')
  try {
    const programs = createProgramService(db)
    const exercise = createExerciseService(db).createExercise({ name: 'Squat' })
    for (const input of [
      { name: '' }, { name: 'Test', exercises: [{ exerciseId: exercise.id, sets: -1 }] },
      { name: 'Test', exercises: [{ exerciseId: exercise.id, restSeconds: -1 }] },
      { name: 'Test', exercises: [{ exerciseId: exercise.id, targetWeight: Infinity }] }
    ]) assert.throws(() => programs.createProgram(input), error => error.statusCode === 400)
    assert.equal(programs.getProgramCount(), 0)
  } finally { db.close() }
})
