import assert from 'node:assert/strict'
import test from 'node:test'
import { createLiveWakeLock } from '../../src/client/workouts/live-wake-lock.js'

class FakeNoSleep {
  enabled = false
  enables = 0
  disables = 0
  failure: Error | null = null
  get isEnabled() { return this.enabled }
  async enable(): Promise<void> {
    this.enables++
    if (this.failure) throw this.failure
    this.enabled = true
  }
  disable(): void {
    this.disables++
    this.enabled = false
  }
}

function withDocument(hidden: boolean, operation: () => Promise<void>): Promise<void> {
  const original = globalThis.document
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { hidden } })
  return operation().finally(() => Object.defineProperty(globalThis, 'document', { configurable: true, value: original }))
}

test('live wake lock enables while visible and disables exactly once', async () => {
  await withDocument(false, async () => {
    const controller = new FakeNoSleep()
    const wakeLock = createLiveWakeLock(() => controller)
    await wakeLock.enable()
    await wakeLock.enable()
    assert.equal(controller.enables, 1)
    wakeLock.disable()
    wakeLock.disable()
    assert.equal(controller.disables, 1)
    await wakeLock.enable()
    assert.equal(controller.enables, 1)
  })
})

test('live wake lock waits for visibility and permits retry after denial', async () => {
  const original = globalThis.document
  const state = { hidden: true }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: state })
  try {
    const controller = new FakeNoSleep()
    controller.failure = new Error('user activation required')
    const wakeLock = createLiveWakeLock(() => controller)
    await wakeLock.enable()
    assert.equal(controller.enables, 0)
    state.hidden = false
    await wakeLock.enable()
    assert.equal(controller.enables, 1)
    controller.failure = null
    await wakeLock.enable()
    assert.equal(controller.enables, 2)
    assert.equal(controller.isEnabled, true)
  } finally {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: original })
  }
})
