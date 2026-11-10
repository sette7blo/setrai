import assert from 'node:assert/strict'
import test from 'node:test'
import { createCountdownAudio } from '../../src/client/workouts/live-audio.js'
import { phaseEndsAt, intervalPhase, type IntervalSlot } from '../../src/client/workouts/live-plan.js'

class FakeOscillator {
  frequency = { value: 0 }
  starts: number[] = []
  stops: (number | undefined)[] = []
  connect(gain: unknown): unknown { return gain }
  addEventListener(): void {}
  disconnect(): void {}
  start(at: number): void { this.starts.push(at) }
  stop(at?: number): void { this.stops.push(at) }
}
class FakeAudio {
  state = 'suspended'
  currentTime = 10
  baseLatency = 0
  outputLatency = 0
  destination = {}
  oscillators: FakeOscillator[] = []
  sampleRate = 48000
  sources: (FakeOscillator & { buffer: unknown; loop: boolean })[] = []
  ramps: number[] = []
  listeners = new Set<() => void>()
  addEventListener(_name: string, listener: () => void): void { this.listeners.add(listener) }
  removeEventListener(_name: string, listener: () => void): void { this.listeners.delete(listener) }
  createBuffer(): unknown { return {} }
  createBufferSource() {
    const source = Object.assign(new FakeOscillator(), { buffer: null as unknown, loop: false })
    this.sources.push(source)
    return source
  }
  async resume(): Promise<void> { this.state = 'running' }
  async close(): Promise<void> { this.state = 'closed' }
  createOscillator(): FakeOscillator {
    const node = new FakeOscillator()
    this.oscillators.push(node)
    return node
  }
  createGain(): unknown {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime: (value: number) => { this.ramps.push(value) } },
      connect: () => this.destination, disconnect() {} }
  }
}

test('five-second countdown is scheduled on the audio clock independently of late UI ticks', async () => {
  const context = new FakeAudio()
  const audio = createCountdownAudio(() => context as unknown as AudioContext)
  audio.sync({ key: 'rest', endsAt: 11000 }, 1000)
  assert.equal(context.oscillators.length, 0)
  await audio.unlock()
  audio.sync({ key: 'rest', endsAt: 11000 }, 1000)
  assert.deepEqual(context.oscillators.map(node => node.starts[0]), [15, 16, 17, 18, 19, 20])
  assert.deepEqual(context.oscillators.map(node => node.frequency.value), [880, 880, 880, 880, 880, 1175])
  assert.ok(context.ramps.includes(0.6))
  assert.ok(context.ramps.includes(0.8))
  assert.deepEqual(context.oscillators.map(node => node.stops[0]), [15.15, 16.15, 17.15, 18.15, 19.15, 20.65])
  context.currentTime = 17.37
  audio.sync({ key: 'rest', endsAt: 11000 }, 8370)
  assert.equal(context.oscillators.length, 6)
  assert.equal(context.oscillators[4].starts[0], 19)
  audio.close()
  assert.equal(context.state, 'closed')
})

test('timer adjustments, pause, seek and background cancel stale notes without replaying expired beeps', async () => {
  const context = new FakeAudio()
  const audio = createCountdownAudio(() => context as unknown as AudioContext)
  await audio.unlock()
  audio.sync({ key: 'rest', endsAt: 7000 }, 1000)
  const original = [...context.oscillators]
  audio.sync({ key: 'rest', endsAt: 22000 }, 1000)
  assert.ok(original.every(node => node.stops.includes(undefined)))
  audio.sync(null)
  assert.ok(context.oscillators.every(node => node.stops.includes(undefined)))
  context.currentTime = 30
  audio.sync({ key: 'emom:2', endsAt: 10500 }, 10000)
  const latest = context.oscillators.at(-1)!
  assert.deepEqual(latest.starts, [30.5])
  assert.equal(latest.frequency.value, 1175)
  assert.equal(context.oscillators.length, 13)
  audio.close()
  await audio.unlock()
  assert.equal(context.state, 'closed')
})

test('output latency is compensated and missing audio never blocks training', async () => {
  const context = new FakeAudio()
  context.outputLatency = .2
  const audio = createCountdownAudio(() => context as unknown as AudioContext)
  await audio.unlock()
  audio.sync({ key: 'rest', endsAt: 11000 }, 1000)
  assert.ok(Math.abs(context.oscillators[0].starts[0] - 14.8) < .0001)
  const unavailable = createCountdownAudio(() => { throw new Error('Unavailable') })
  await unavailable.unlock()
  unavailable.sync({ key: 'rest', endsAt: 11000 }, 1000)
  unavailable.close()
})

test('EMOM audio deadlines match displayed work, recovery and truncated interval phases', () => {
  const slot: IntervalSlot = { index: 0, blockIndex: 0, roundIndex: 0, intervalIndex: 0,
    startsAt: 60, endsAt: 120, duration: 60,
    steps: [{ exerciseSlug: 'hold', targetDurationSec: 20 }, { exerciseSlug: 'row', targetDurationSec: 15 }] }
  for (const position of [60, 75.5, 80, 90.4, 95, 115.3]) {
    assert.equal(Math.ceil(phaseEndsAt(slot, position) - position), intervalPhase(slot, position).remaining)
  }
  assert.equal(phaseEndsAt({ ...slot, endsAt: 85, duration: 25 }, 82), 85)
})

test('audio recovers from browser suspension without replaying missed countdown cues', async () => {
  const context = new FakeAudio()
  const audio = createCountdownAudio(() => context as unknown as AudioContext)
  await audio.unlock()
  audio.sync({ key: 'rest', endsAt: 11000 }, 1000)
  const original = [...context.oscillators]
  context.state = 'suspended'
  audio.sync({ key: 'rest', endsAt: 11000 }, 7000)
  assert.ok(original.every(node => node.stops.includes(undefined)))
  context.currentTime = 16
  await audio.unlock()
  audio.sync({ key: 'rest', endsAt: 11000 }, 8500)
  assert.deepEqual(context.oscillators.slice(6).map(node => node.starts[0]), [16.5, 17.5, 18.5])
  audio.close()
})

test('a context closed by the browser is recreated on the next activation', async () => {
  const contexts: FakeAudio[] = []
  const audio = createCountdownAudio(() => {
    const context = new FakeAudio()
    contexts.push(context)
    return context as unknown as AudioContext
  })
  await audio.unlock()
  audio.sync({ key: 'rest', endsAt: 11000 }, 1000)
  contexts[0].state = 'closed'
  await audio.unlock()
  audio.sync({ key: 'rest', endsAt: 11000 }, 1000)
  assert.equal(contexts.length, 2)
  assert.equal(contexts[1].oscillators.length, 6)
  audio.close()
})

test('only a gesture creates audio and primes it synchronously before resume settles', async () => {
  const context = new FakeAudio()
  let release!: () => void
  context.resume = () => new Promise<void>(resolve => { release = () => { context.state = 'running'; resolve() } })
  let created = 0
  const audio = createCountdownAudio(() => { created++; return context as unknown as AudioContext })
  await audio.resume()
  assert.equal(created, 0)
  const unlocked = audio.unlock()
  assert.equal(created, 1)
  assert.deepEqual(context.sources[0].starts, [0])
  assert.equal(context.sources[0].loop, false)
  release()
  await unlocked
  assert.equal(context.sources[1].loop, true)
  await audio.unlock()
  assert.equal(context.sources.filter(source => source.loop).length, 1)
  audio.close()
  assert.ok(context.sources[1].stops.includes(undefined))
  assert.equal(context.listeners.size, 0)
})

test('backgrounding rebuilds a stale running context only on the next gesture', async () => {
  const contexts: FakeAudio[] = []
  const audio = createCountdownAudio(() => {
    const context = new FakeAudio()
    contexts.push(context)
    return context as unknown as AudioContext
  })
  await audio.unlock()
  audio.background()
  await audio.resume()
  assert.equal(contexts.length, 1)
  assert.equal(contexts[0].state, 'running')
  await audio.unlock()
  assert.equal(contexts.length, 2)
  assert.equal(contexts[0].state, 'closed')
  assert.equal(contexts[1].state, 'running')
  audio.close()
})

test('the final Workstr tone finishes its envelope when the timer expires', async () => {
  const context = new FakeAudio()
  const audio = createCountdownAudio(() => context as unknown as AudioContext)
  await audio.unlock()
  audio.sync({ key: 'rest', endsAt: 11000 }, 1000)
  const final = context.oscillators.at(-1)!
  context.currentTime = 20.02
  audio.sync(null, 11020)
  assert.deepEqual([...final.stops], [20.65])
  audio.background()
  assert.ok(final.stops.includes(undefined))
  audio.close()
})

test('a new gesture bypasses an earlier stalled resume attempt', async () => {
  const context = new FakeAudio()
  let attempts = 0
  context.resume = () => {
    attempts++
    if (attempts === 1) return new Promise<void>(() => {})
    context.state = 'running'
    return Promise.resolve()
  }
  const audio = createCountdownAudio(() => context as unknown as AudioContext)
  const stalled = audio.unlock()
  await audio.unlock()
  assert.equal(attempts, 2)
  assert.equal(context.state, 'running')
  audio.sync({ key: 'rest', endsAt: 11000 }, 1000)
  assert.equal(context.oscillators.length, 6)
  audio.close()
  await stalled
})

test('prefixed WebKit audio constructors receive the same gesture priming', async () => {
  const descriptors = ['AudioContext', 'webkitAudioContext'].map(key => Object.getOwnPropertyDescriptor(globalThis, key))
  const context = new FakeAudio()
  const audio = createCountdownAudio()
  try {
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: undefined })
    Object.defineProperty(globalThis, 'webkitAudioContext', { configurable: true, value: function () { return context } })
    await audio.unlock()
    assert.deepEqual(context.sources[0].starts, [0])
    audio.sync({ key: 'rest', endsAt: 11000 }, 1000)
    assert.equal(context.oscillators.length, 6)
  } finally {
    audio.close()
    for (const [index, key] of ['AudioContext', 'webkitAudioContext'].entries()) {
      const descriptor = descriptors[index]
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
