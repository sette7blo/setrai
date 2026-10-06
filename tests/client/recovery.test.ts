import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeRecovery, recoveryPercent, sortedRecovery, statusLabel, lastTrainedText } from '../../src/client/recovery/format.js'

test('normalizes Recovery API payload', () => {
  const recovery = normalizeRecovery({ generatedAt: 'now', lookbackDays: 7, muscles: [{ muscle: 'chest', recovery: 0.82, status: 'ready', lastTrainedAt: '2026-10-03T00:00:00.000Z' }] })
  assert.equal(recovery.muscles[0].muscle, 'chest')
  assert.equal(recovery.muscles[0].recovery, 0.82)
})

test('formats Recovery percent and statuses', () => {
  assert.equal(recoveryPercent(0.82), '82%')
  assert.equal(statusLabel('ready'), 'Ready')
  assert.equal(statusLabel('moderate'), 'Moderate')
  assert.equal(statusLabel('recovering'), 'Recovering')
})

test('sorts Recovery presentation by lowest recovery first', () => {
  const sorted = sortedRecovery([
    { muscle: 'chest', recovery: 0.82, status: 'ready', lastTrainedAt: '' },
    { muscle: 'back', recovery: 0.22, status: 'recovering', lastTrainedAt: '' }
  ])
  assert.equal(sorted[0].muscle, 'back')
})

test('formats last-trained helper and empty state shape', () => {
  assert.equal(normalizeRecovery({ muscles: [] }).muscles.length, 0)
  assert.equal(lastTrainedText(''), 'No recent training date')
})
