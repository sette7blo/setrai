import assert from 'node:assert/strict'
import test from 'node:test'

import { progressMetric, progressPoints, setsLine } from '../../src/client/exercises/progress-view.js'
import type { ExerciseProgress, ExerciseProgressSession } from '../../src/client/statistics/types.js'

function session(index: number, sets: ExerciseProgressSession['sets'], bestEstimated1RM: number | null): ExerciseProgressSession {
  const top = [...sets].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.durationSec ?? 0) - (a.durationSec ?? 0) || b.reps - a.reps)[0]
  return { sessionId: index, finishedAt: `2026-10-${String(index).padStart(2, '0')} 10:00:00`, sets, topSet: top, bestEstimated1RM, volume: 0 }
}

function progress(sessions: ExerciseProgressSession[]): ExerciseProgress {
  return { exercise: { id: 1, slug: 'x', name: 'X' }, sessions, best: { heaviestWeight: null, estimated1RM: null, mostReps: null, longestDurationSec: null } }
}

const set = (reps: number, weight: number | null, durationSec: number | null = null) => ({ setNumber: 1, reps, weight, durationSec })

test('picks the chart metric from the kind of history', () => {
  assert.equal(progressMetric(progress([session(2, [set(8, 80)], 101.33)])), 'estimated1RM')
  assert.equal(progressMetric(progress([session(2, [set(0, null, 45)], null)])), 'durationSec')
  assert.equal(progressMetric(progress([session(2, [set(15, null)], null)])), 'reps')
})

test('chart points run oldest to newest and are thinned to 50', () => {
  const few = progress([session(3, [set(8, 90)], 114), session(2, [set(8, 80)], 101.33)])
  assert.deepEqual(progressPoints(few, 'estimated1RM').map(point => point.value), [101.33, 114])
  const many = progress(Array.from({ length: 120 }, (_, index) => session(120 - index, [set(10, null)], null)))
  const points = progressPoints(many, 'reps')
  assert.equal(points.length, 50)
  assert.equal(points[0].date, many.sessions.at(-1)!.finishedAt)
  assert.equal(points.at(-1)!.date, many.sessions[0].finishedAt)
})

test('summarises a session\'s sets compactly in the saved unit', () => {
  assert.equal(setsLine([set(8, 80), set(8, 80), set(7, 80)], 'kg'), '80 x 8, 8, 7')
  assert.equal(setsLine([set(8, 80), set(6, 85)], 'kg'), '80 x 8, 85 x 6')
  assert.equal(setsLine([set(8, 80)], 'lb'), '176.4 x 8')
  assert.equal(setsLine([set(12, null), set(10, null)], 'kg'), '12, 10 reps')
  assert.equal(setsLine([set(0, null, 45), set(0, null, 40)], 'kg'), '45 s, 40 s')
})
