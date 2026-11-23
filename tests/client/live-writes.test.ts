import assert from 'node:assert/strict'
import test from 'node:test'
import { createWriteQueue } from '../../src/client/workouts/live-writes.js'

function deferred(): { promise: Promise<void>, resolve: () => void, reject: (error: Error) => void } {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

test('a failed live-state save does not block logging the next set', async () => {
  const writes = createWriteQueue()
  const calls: string[] = []
  let failNext = true
  const saveLiveState = async () => {
    calls.push('save')
    if (failNext) { failNext = false; throw new Error('offline') }
  }
  const logSessionSet = async () => { calls.push('log'); return { id: 1 } }
  const log = async () => { await writes.settled(); return logSessionSet() }

  await assert.rejects(writes.run(saveLiveState), /offline/)
  assert.deepEqual(await log(), { id: 1 })
  assert.deepEqual(await log(), { id: 1 })
  assert.deepEqual(calls, ['save', 'log', 'log'])
})

test('a later save still runs after an earlier one failed', async () => {
  const writes = createWriteQueue()
  const calls: number[] = []
  const failed = writes.run(async () => { calls.push(1); throw new Error('offline') })
  const saved = writes.run(async () => { calls.push(2); return 'ok' })

  await assert.rejects(failed, /offline/)
  assert.equal(await saved, 'ok')
  assert.deepEqual(calls, [1, 2])
})

test('a set is logged only after earlier saves have settled', async () => {
  const writes = createWriteQueue()
  const calls: string[] = []
  const first = deferred()
  const second = deferred()
  const firstSave = writes.run(async () => { await first.promise; calls.push('save 1') })
  const secondSave = writes.run(async () => { await second.promise; calls.push('save 2') })
  const log = writes.settled().then(() => { calls.push('log') })

  second.resolve()
  await Promise.resolve()
  assert.deepEqual(calls, [])

  first.reject(new Error('offline'))
  await assert.rejects(firstSave, /offline/)
  await secondSave
  await log
  assert.deepEqual(calls, ['save 2', 'log'])
})

test('settled resolves at once when nothing is pending', async () => {
  const writes = createWriteQueue()
  assert.equal(await writes.settled(), undefined)
})
