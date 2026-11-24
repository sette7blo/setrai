import assert from 'node:assert/strict'
import test from 'node:test'

import { lastTimeSet, lastTimeText, progressionHint, topOfRepRange } from '../../src/client/workouts/live-progression.js'
import type { LastPerformance } from '../../src/client/workouts/types.js'

function last(sets: Array<[number, number | null, number?]>): LastPerformance {
  return { finishedAt: '2026-11-20 10:00:00', sets: sets.map(([reps, weight, durationSec], index) => ({ setNumber: index + 1, reps, weight, durationSec: durationSec ?? null })) }
}

test('matches the same set number, falling back to last time\'s final set', () => {
  const bench = last([[8, 80], [8, 80], [7, 80]])
  assert.equal(lastTimeSet(bench, 2)?.reps, 8)
  assert.equal(lastTimeSet(bench, 5)?.setNumber, 3)
  assert.equal(lastTimeSet(null, 1), null)
  assert.equal(lastTimeSet({ finishedAt: '', sets: [] }, 1), null)
})

test('formats last time per kind of set and unit', () => {
  assert.equal(lastTimeText({ setNumber: 1, reps: 8, weight: 80, durationSec: null }, 'kg'), 'Last time: 80 kg x 8')
  assert.equal(lastTimeText({ setNumber: 1, reps: 8, weight: 80, durationSec: null }, 'lb'), 'Last time: 176.4 lb x 8')
  assert.equal(lastTimeText({ setNumber: 1, reps: 12, weight: null, durationSec: null }, 'kg'), 'Last time: 12 reps')
  assert.equal(lastTimeText({ setNumber: 1, reps: 0, weight: null, durationSec: 45 }, 'kg'), 'Last time: 45 s')
})

test('reads the top of the prescribed rep range', () => {
  assert.equal(topOfRepRange('6-8'), 8)
  assert.equal(topOfRepRange(' 10 '), 10)
  assert.equal(topOfRepRange('8–12'), 12)
  assert.equal(topOfRepRange('AMRAP'), null)
  assert.equal(topOfRepRange('30s'), null)
})

test('double progression: add one increment only when every set hit the top', () => {
  assert.equal(progressionHint(last([[8, 80], [8, 80], [8, 80]]), '6-8', 'kg'), 'Try 82.5 kg')
  assert.equal(progressionHint(last([[8, 80], [8, 80], [7, 80]]), '6-8', 'kg'), 'Repeat 80 kg')
  assert.equal(progressionHint(last([[10, 60]]), '10', 'kg'), 'Try 62.5 kg')
  assert.equal(progressionHint(last([[8, 80], [8, 80]]), '6-8', 'lb'), 'Try 181 lb')
  assert.equal(progressionHint(last([[5, 81.647]]), '5', 'lb'), 'Try 185 lb')
  assert.equal(progressionHint(last([[7, 80]]), '6-8', 'lb'), 'Repeat 176.4 lb')
})

test('no hint without a weight, a numeric target, or for timed sets', () => {
  assert.equal(progressionHint(last([[12, null], [12, null]]), '10-12', 'kg'), null)
  assert.equal(progressionHint(last([[12, 0]]), '10-12', 'kg'), null)
  assert.equal(progressionHint(last([[8, 80]]), 'AMRAP', 'kg'), null)
  assert.equal(progressionHint(last([[0, null, 40]]), '40', 'kg'), null)
  assert.equal(progressionHint(null, '6-8', 'kg'), null)
})
