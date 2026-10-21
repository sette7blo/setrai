import assert from 'node:assert/strict'
import test from 'node:test'

import { hasTrainingHistory, normalizeStatistics, normalizeTrainingRange, overviewItems, recordText, weeklyChartSeries, weeklyVolumeForRange } from '../../src/client/statistics/format.js'

test('normalizes Statistics API payload', () => {
  const stats = normalizeStatistics({ trainingFrequency: { totalSessions: 2, thisWeek: 1 }, totalVolume: 1250 })
  assert.equal(stats.trainingFrequency.totalSessions, 2)
  assert.equal(stats.trainingFrequency.thisWeek, 1)
  assert.equal(stats.totalVolume, 1250)
  assert.deepEqual(stats.weeklyVolume, [])
})

test('formats overview and empty state determination', () => {
  const stats = normalizeStatistics({ trainingFrequency: { totalSessions: 3, thisWeek: 2 }, totalVolume: 12450, trainingStreak: { currentStreakDays: 5, currentStreakWeeks: 4 } })
  assert.equal(hasTrainingHistory(stats), true)
  assert.deepEqual(overviewItems(stats, 'kg'), [
    { label: 'This week', value: '2 workouts' },
    { label: 'Training streak', value: '5 days' },
    { label: 'Total volume', value: '12,450 kg' }
  ])
  assert.equal(hasTrainingHistory(normalizeStatistics({})), false)
})

test('maps weekly chart series and PR display with units', () => {
  const series = weeklyChartSeries([{ weekStart: '2026-10-05', volume: 1000 }], 'lb')
  assert.equal(Math.round(series[0].value), 2205)
  assert.equal(series[0].text, '2,205 lb')
  assert.equal(recordText(100, 'kg'), '100 kg')
  assert.equal(recordText(100, 'lb'), '220.5 lb')
})

test('filters weekly volume by the selected calendar range', () => {
  const points = [
    { weekStart: '2025-01-06', volume: 100 },
    { weekStart: '2025-11-03', volume: 200 },
    { weekStart: '2026-01-05', volume: 300 },
    { weekStart: '2026-01-26', volume: 400 },
  ]
  const now = new Date('2026-01-28T12:00:00.000Z')
  assert.deepEqual(weeklyVolumeForRange(points, '4w', now).map(point => point.volume), [300, 400])
  assert.deepEqual(weeklyVolumeForRange(points, '3m', now).map(point => point.volume), [200, 300, 400])
  assert.deepEqual(weeklyVolumeForRange(points, '1y', now).map(point => point.volume), [200, 300, 400])
  assert.deepEqual(weeklyVolumeForRange(points, 'all', now).map(point => point.volume), [100, 200, 300, 400])
  assert.equal(normalizeTrainingRange('4w'), '4w')
  assert.equal(normalizeTrainingRange('unexpected'), 'all')
})
