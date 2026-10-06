import assert from 'node:assert/strict'
import test from 'node:test'

import { chooseActiveSession, chooseRecentCompletedSession, recoveryCounts, summarizeHome } from '../../src/client/app/home-page.js'
import type { RecoveryOverview } from '../../src/client/recovery/types.js'
import type { StatisticsOverview } from '../../src/client/statistics/types.js'
import type { Session } from '../../src/client/workouts/types.js'

const active = { id: 1, programName: 'Active', finishedAt: null, startedAt: '', notes: '', sets: [], plannedExercises: [], programId: null } as Session
const done = { id: 2, programName: 'Done', finishedAt: '2026-10-05', startedAt: '', notes: '', sets: [{ id: 1 }], plannedExercises: [], programId: null } as unknown as Session

test('Home prioritizes active Session and recent completed Session', () => {
  assert.equal(chooseActiveSession([active, done])?.id, 1)
  assert.equal(chooseRecentCompletedSession([active, done])?.id, 2)
})

test('Home derives Recovery and weekly summaries', () => {
  const recovery = { generatedAt: '', lookbackDays: 7, muscles: [
    { muscle: 'chest', recovery: 0.8, status: 'ready', lastTrainedAt: '' },
    { muscle: 'back', recovery: 0.5, status: 'moderate', lastTrainedAt: '' },
    { muscle: 'triceps', recovery: 0.2, status: 'recovering', lastTrainedAt: '' }
  ] } as RecoveryOverview
  const stats = {
    trainingFrequency: { totalSessions: 2, thisWeek: 1 },
    trainingStreak: { currentStreakWeeks: 3, longestStreakWeeks: 4 },
    totalVolume: 0,
    weeklyVolume: [], volumeByExercise: [], volumeByMuscle: [], personalRecords: [], bodyWeight: []
  } as StatisticsOverview
  assert.deepEqual(recoveryCounts(recovery), { readyCount: 1, moderateCount: 1, recoveringCount: 1 })
  const summary = summarizeHome(stats, recovery, [done], '82.1 kg · Oct 5')
  assert.equal(summary.weeklyText, '1 workouts this week')
  assert.equal(summary.streakText, '3 week streak')
  assert.equal(summary.latestWeight, '82.1 kg · Oct 5')
  assert.equal(summary.hasTraining, true)
})
