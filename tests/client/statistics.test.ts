import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeStatistics, overviewItems, weeklyChartSeries, recordText, hasTrainingHistory } from '../../src/client/statistics/format.js'

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
