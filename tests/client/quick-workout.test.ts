import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiClient } from '../../src/client/shared/api/client.js'
import { generateQuickWorkout, startQuickWorkout } from '../../src/client/quick-workout/api.js'
import { fallbackText, goalLabel, normalizeQuickWorkout, prescriptionText, validateDuration } from '../../src/client/quick-workout/format.js'
import { shouldOpenRecoveryWorkoutSheet } from '../../src/client/quick-workout/recovery-sheet.js'

const payload = {
  name: 'Quick Workout',
  durationMinutes: 30,
  goal: 'hypertrophy',
  recoveryFallback: 'moderate' as const,
  exercises: [
    { exerciseId: 2, exerciseSlug: 'goblet-squat', exerciseName: 'Goblet Squat', sets: 3, reps: '8-12', restSec: 90 },
    { exerciseId: 1, exerciseSlug: 'bench-press', exerciseName: 'Bench Press', sets: 3, reps: '8-12', restSec: 90 }
  ]
}

test('normalizes Quick Workout preview and preserves exercise ordering', () => {
  const workout = normalizeQuickWorkout(payload)
  assert.equal(workout.durationMinutes, 30)
  assert.equal(workout.goal, 'hypertrophy')
  assert.equal(workout.recoveryFallback, 'moderate')
  assert.deepEqual(workout.exercises.map((item) => item.exerciseSlug), ['goblet-squat', 'bench-press'])
  assert.equal(prescriptionText(workout.exercises[0]), '3 × 8-12 · 90 sec rest')
})

test('formats duration, goal, and recovery fallback presentation', () => {
  assert.equal(validateDuration(10), 'Duration must be between 15 and 90 minutes.')
  assert.equal(validateDuration(30), null)
  assert.equal(goalLabel('general-fitness'), 'General Fitness')
  assert.match(fallbackText('moderate'), /moderate-recovery/)
})

test('Quick opens the composer sheet while Resume and modified clicks keep link navigation', () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }
  assert.equal(shouldOpenRecoveryWorkoutSheet(click, false), true)
  assert.equal(shouldOpenRecoveryWorkoutSheet(click, true), false)
  assert.equal(shouldOpenRecoveryWorkoutSheet({ ...click, metaKey: true }, false), false)
  assert.equal(shouldOpenRecoveryWorkoutSheet({ ...click, button: 1 }, false), false)
})

test('Generate Quick Workout API sends duration and target muscles', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string, init?: RequestInit }> = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify({ workout: payload }), { status: 200 })
    }
    const workout = await generateQuickWorkout({ durationMinutes: 45, targetMuscles: ['chest', 'triceps'] }, new ApiClient())
    assert.equal(workout.durationMinutes, 30)
    assert.equal(calls[0].url, '/api/quick-workout')
    assert.equal(calls[0].init?.method, 'POST')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { durationMinutes: 45, targetMuscles: ['chest', 'triceps'] })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Start Quick Workout API sends generated plan and returns canonical Session', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string, init?: RequestInit }> = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify({
        workout: payload,
        program: { id: 9, slug: 'quick-workout', name: 'Quick Workout', isTemporary: true, exercises: payload.exercises },
        session: { id: 7, programId: 9, programName: 'Quick Workout', plannedExercises: payload.exercises, sets: [] }
      }), { status: 201 })
    }
    const result = await startQuickWorkout(normalizeQuickWorkout(payload), new ApiClient())
    assert.equal(result.program.isTemporary, true)
    assert.equal(result.session.id, 7)
    assert.equal(calls[0].url, '/api/quick-workout/start')
    assert.equal(calls[0].init?.method, 'POST')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)).workout.exercises.map((item: { exerciseId: number }) => item.exerciseId), [2, 1])
  } finally {
    globalThis.fetch = originalFetch
  }
})
