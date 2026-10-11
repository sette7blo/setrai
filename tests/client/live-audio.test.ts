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
  async resume(): Promise<void> { this.state = 'running' }
  async close(): Promise<void> { this.state = 'closed' }
  createOscillator(): FakeOscillator {
    const node = new FakeOscillator()
    this.oscillators.push(node)
    return node
  }
  createGain(): unknown {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
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
  assert.deepEqual(context.oscillators.map(node => node.frequency.value), [660, 660, 660, 660, 660, 880])
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
  assert.equal(latest.frequency.value, 880)
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
