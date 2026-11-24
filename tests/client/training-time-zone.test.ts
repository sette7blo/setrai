import assert from 'node:assert/strict'
import test from 'node:test'

import { setTrainingTimeZone, trainingDayKey, trainingTimeZone, weekStartOfDayKey } from '../../src/client/shared/training-time-zone.js'
import { currentWeekVolume } from '../../src/client/app/today-page.js'
import { sessionDateKey } from '../../src/client/workouts/history-session-card.js'
import { normalizeSession } from '../../src/client/workouts/format.js'
import type { StatisticsOverview } from '../../src/client/statistics/types.js'

const finished = (finishedAt: string) => normalizeSession({ id: 1, programName: 'A', startedAt: finishedAt, finishedAt, sets: [] })

test('History days follow the training zone east and west of UTC', () => {
  const original = trainingTimeZone()
  try {
    setTrainingTimeZone('Europe/Berlin')
    assert.equal(sessionDateKey(finished('2026-11-23 22:30:00')), '2026-11-23') // 23:30 local
    assert.equal(sessionDateKey(finished('2026-11-23 23:30:00')), '2026-11-24') // 00:30 local
    setTrainingTimeZone('America/New_York')
    assert.equal(sessionDateKey(finished('2026-11-24 04:30:00')), '2026-11-23') // 23:30 local
    assert.equal(sessionDateKey(finished('2026-11-24 05:30:00')), '2026-11-24') // 00:30 local
    setTrainingTimeZone('Not/AZone')
    assert.equal(trainingTimeZone(), 'America/New_York')
  } finally {
    setTrainingTimeZone(original)
  }
})

test('weeks start on Monday and survive DST changes', () => {
  assert.equal(weekStartOfDayKey('2026-11-29'), '2026-11-23')
  assert.equal(weekStartOfDayKey('2026-11-23'), '2026-11-23')
  assert.equal(trainingDayKey(new Date('2026-10-25T22:30:00Z'), 'Europe/Berlin'), '2026-10-25')
  assert.equal(weekStartOfDayKey(trainingDayKey(new Date('2026-10-25T23:30:00Z'), 'Europe/Berlin')), '2026-10-26')
  assert.equal(weekStartOfDayKey(trainingDayKey(new Date('2026-03-09T03:30:00Z'), 'America/New_York')), '2026-03-02')
})

test('Today\'s week matches the server bucket in the statistics zone', () => {
  const stats = { timeZone: 'America/New_York', weeklyVolume: [{ weekStart: '2026-11-16', volume: 500 }, { weekStart: '2026-11-23', volume: 900 }] } as unknown as StatisticsOverview
  // Monday 01:00 UTC is still Sunday evening in New York.
  assert.equal(currentWeekVolume(stats, new Date('2026-11-23T01:00:00Z')), 500)
  assert.equal(currentWeekVolume(stats, new Date('2026-11-23T06:00:00Z')), 900)
  assert.equal(currentWeekVolume({ ...stats, timeZone: 'Europe/Berlin' }, new Date('2026-11-22T23:30:00Z')), 900)
})
