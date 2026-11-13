import assert from 'node:assert/strict'
import test from 'node:test'

import { currentWeekVolume, readinessSentence } from '../../src/client/app/today-page.js'
import { finishedAtForDuration } from '../../src/client/workouts/history-duration.js'
import type { StatisticsOverview } from '../../src/client/statistics/types.js'

function stats(weeklyVolume: StatisticsOverview['weeklyVolume']): StatisticsOverview {
  return {
    trainingFrequency: { totalSessions: 0, thisWeek: 0 },
    totalVolume: 0,
    weeklyVolume,
    volumeByExercise: [],
    volumeByMuscle: [],
    personalRecords: [],
    trainingStreak: { currentStreakWeeks: 0 },
    bodyWeight: [],
    bodyWeightChangeKg: null
  }
}

test('readiness sentence names only the muscles that still need time', () => {
  const ready = { muscle: 'chest', recovery: 1, status: 'ready' as const, lastTrainedAt: '' }
  assert.equal(
    readinessSentence({ generatedAt: '', lookbackDays: 7, readiness: 100, muscles: [ready] }),
    'Every muscle group is recovered.'
  )
  assert.equal(
    readinessSentence({ generatedAt: '', lookbackDays: 7, readiness: 100, muscles: [
      ready,
      { muscle: 'back', recovery: 0.4, status: 'moderate', lastTrainedAt: '' }
    ] }),
    'Back still needs time.'
  )
  assert.equal(
    readinessSentence({ generatedAt: '', lookbackDays: 7, readiness: 100, muscles: [
      { muscle: 'back', recovery: 0.4, status: 'moderate', lastTrainedAt: '' },
      { muscle: 'triceps', recovery: 0.1, status: 'recovering', lastTrainedAt: '' }
    ] }),
    'Triceps and Back still need time.'
  )
})

test('this week volume ignores an older newest bucket', () => {
  const wednesday = new Date('2026-11-11T12:00:00.000Z')
  assert.equal(currentWeekVolume(stats([
    { weekStart: '2026-11-02', volume: 500 },
    { weekStart: '2026-11-09', volume: 320 }
  ]), wednesday), 320)
  assert.equal(currentWeekVolume(stats([{ weekStart: '2026-11-02', volume: 500 }]), wednesday), 0)
  // Sunday still belongs to the week that started the previous Monday.
  assert.equal(currentWeekVolume(stats([{ weekStart: '2026-11-09', volume: 90 }]), new Date('2026-11-15T23:00:00.000Z')), 90)
})

test('a corrected duration becomes a finish time in the stored UTC format', () => {
  assert.equal(finishedAtForDuration('2026-10-11 09:30:00', 45), '2026-10-11 10:15:00')
  assert.equal(finishedAtForDuration('2026-10-11 23:40:00', 30), '2026-10-12 00:10:00')
})
