import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiClient } from '../../src/client/shared/api/client.js'
import { displayWeightFromKg, inputWeightToKg, formatWeightFromKg, formatBodyWeightFromKg } from '../../src/client/profile/weight-units.js'
import { normalizeBodyWeight, saveBodyWeight, deleteBodyWeight } from '../../src/client/profile/body-weight/api.js'
import { newestFirst, oldestFirst } from '../../src/client/profile/body-weight/format.js'

test('converts and rounds kg/lb at presentation boundary', () => {
  assert.equal(displayWeightFromKg(100, 'lb'), 220.5)
  assert.equal(inputWeightToKg(220.462, 'lb'), 100)
  assert.equal(inputWeightToKg(170.1, 'lb'), 77.156)
  assert.equal(displayWeightFromKg(inputWeightToKg(170.1, 'lb'), 'lb'), 170.1)
  assert.equal(formatWeightFromKg(80, 'kg'), '80 kg')
  assert.equal(formatBodyWeightFromKg(76.793, 'lb'), '169.3 lb')
  assert.equal(formatBodyWeightFromKg(80, 'kg'), '80.0 kg')
})

test('normalizes Body Weight API payload safely', () => {
  const entry = normalizeBodyWeight({ id: 1, date: '2026-10-06', weight_kg: 80.5, notes: 'AM', created_at: 'c', updated_at: 'u' })
  assert.equal(entry.weightKg, 80.5)
  assert.equal('weight_kg' in entry, false)
})

test('sorts body-weight history and formats latest text', () => {
  const entries = [
    normalizeBodyWeight({ id: 1, date: '2026-10-01', weightKg: 80 }),
    normalizeBodyWeight({ id: 2, date: '2026-10-03', weightKg: 81 })
  ]
  assert.equal(newestFirst(entries)[0].id, 2)
  assert.equal(oldestFirst(entries)[0].id, 1)

})

test('Body Weight POST and DELETE contracts', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string, init?: RequestInit }> = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      return new Response(JSON.stringify({ entry: { id: 1, date: '2026-10-06', weightKg: 80 } }), { status: 201 })
    }
    await saveBodyWeight({ date: '2026-10-06', weightKg: 80, notes: '' }, new ApiClient())
    await deleteBodyWeight(1, new ApiClient())
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { date: '2026-10-06', weightKg: 80, notes: '' })
    assert.equal(calls[1].url, '/api/body-weight/1')
    assert.equal(calls[1].init?.method, 'DELETE')
  } finally {
    globalThis.fetch = originalFetch
  }
})
