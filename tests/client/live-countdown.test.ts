import assert from 'node:assert/strict'
import test from 'node:test'
import { paintCountdown } from '../../src/client/workouts/live-components.js'

test('countdown warns for the final five seconds and resets after extending or ending the timer', () => {
  const value = { textContent: '', attributes: {} as Record<string, string>,
    setAttribute(name: string, content: string) { this.attributes[name] = content } }
  const circle = { style: { strokeDashoffset: '' }, attributes: {} as Record<string, string>,
    setAttribute(name: string, content: string) { this.attributes[name] = content } }
  const root = { querySelector: (selector: string) => selector === '[data-clock-value]' ? value : circle } as unknown as HTMLElement
  for (const seconds of [6, 5, 4, 3, 2, 1, 20, 5, 0, -1]) {
    paintCountdown(root, seconds, seconds / 60)
    const warning = String(seconds > 0 && seconds <= 5)
    assert.equal(value.attributes['data-warning'], warning)
    assert.equal(circle.attributes['data-warning'], warning)
    assert.equal(value.textContent, String(Math.max(0, seconds)))
  }
})
