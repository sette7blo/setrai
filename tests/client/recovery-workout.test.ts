import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeQuickWorkout } from '../../src/client/quick-workout/format.js'
import { swapRecoveryExercise, removeRecoveryExercise } from '../../src/client/quick-workout/recovery-plan.js'

const item = (id: number, muscleGroup = 'biceps') => ({ exerciseId: id, exerciseSlug: `curl-${id}`,
  exerciseName: `Curl ${id}`, muscleGroup, sets: 3, reps: '8-12', restSec: 90 })

test('ready-muscle alternatives survive normalization and cycle without duplicating selected exercises', () => {
  const original = normalizeQuickWorkout({ name: 'Quick Workout', durationMinutes: 30,
    estimatedDurationMinutes: 18, exercises: [item(1), item(4, 'back')], pool: { biceps: [item(2), item(3)], back: [] } })
  const first = swapRecoveryExercise(original, 0)
  assert.deepEqual(first.exercises.map(item => item.exerciseId), [2, 4])
  assert.deepEqual(first.pool?.biceps.map(item => item.exerciseId), [3, 1])
  const second = swapRecoveryExercise(first, 0)
  const third = swapRecoveryExercise(second, 0)
  assert.deepEqual(third.exercises.map(item => item.exerciseId), [1, 4])
  assert.deepEqual(original.exercises.map(item => item.exerciseId), [1, 4])
  assert.equal(swapRecoveryExercise(original, 1), original)
})

test('removal keeps the preview order and recalculates the estimate, including the last exercise', () => {
  const original = normalizeQuickWorkout({ exercises: [item(1), item(4, 'back')], estimatedDurationMinutes: 18 })
  const reduced = removeRecoveryExercise(original, 0)
  assert.deepEqual(reduced.exercises.map(item => item.exerciseId), [4])
  assert.equal(reduced.estimatedDurationMinutes, 9)
  assert.equal(removeRecoveryExercise(reduced, 0).estimatedDurationMinutes, 0)
  assert.deepEqual(removeRecoveryExercise(reduced, 0).exercises, [])
})
