import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSession } from '../../src/client/workouts/format.js'
import { clockValue, compileIntervals, intervalPhase, nextSet, setCount, strengthExercises, supersetNext } from '../../src/client/workouts/live-plan.js'

function session() {
  return normalizeSession({ id: 1, plannedExercises: [
    { exerciseId: 1, exerciseSlug: 'squat', sets: 2 }, { exerciseId: 2, exerciseSlug: 'row', sets: 2 },
    { exerciseId: 3, exerciseSlug: 'hold', sets: 2 }
  ], blocks: [
    { type: 'straight', rounds: 2, steps: [{ exerciseSlug: 'squat' }, { exerciseSlug: 'row' }], restAfterRoundSec: 30 },
    { type: 'emom', rounds: 2, intervals: [{ durationSec: 60, steps: [{ exerciseSlug: 'hold', targetDurationSec: 20 }] }] }
  ] })
}

test('mixed plans separate strength from intervals and rest only after superset rounds', () => {
  const model = session()
  assert.deepEqual(strengthExercises(model).map((exercise) => exercise.exerciseSlug), ['squat', 'row'])
  assert.equal(supersetNext(model, model.plannedExercises[0], 1)?.rest, 0)
  assert.equal(supersetNext(model, model.plannedExercises[0], 1)?.slug, 'row')
  assert.equal(supersetNext(model, model.plannedExercises[1], 1)?.rest, 30)
  assert.equal(supersetNext(model, model.plannedExercises[1], 1)?.slug, 'squat')
  assert.equal(supersetNext(model, model.plannedExercises[1], 2)?.slug, null)
})

test('EMOM duration cycles and truncates the final interval without extra rounds', () => {
  const model = session()
  model.blocks![1].totalDurationSec = 150
  const slots = compileIntervals(model)
  assert.deepEqual(slots.map((slot) => [slot.startsAt, slot.endsAt, slot.duration]), [[0, 60, 60], [60, 120, 60], [120, 150, 30]])
  assert.equal(slots[2].roundIndex, 2)
  assert.deepEqual(intervalPhase(slots[0], 10), { label: 'Work', stepIndex: 0, remaining: 10 })
  assert.deepEqual(intervalPhase(slots[0], 20), { label: 'Recover', stepIndex: null, remaining: 40 })
})

test('paused and running clocks use elapsed wall time without accumulating tick drift', () => {
  assert.deepEqual(clockValue({ emomPositionSec: 60, emomActiveSec: 15, emomRunningSince: null }, 5000), { position: 60, active: 15 })
  assert.deepEqual(clockValue({ emomPositionSec: 60, emomActiveSec: 15, emomRunningSince: 1000 }, 5000), { position: 64, active: 19 })
})

test('deleted set holes reopen and interval logs do not complete strength work', () => {
  const model = session()
  model.runtime = { setCounts: { squat: 4 } }
  model.sets = [1, 3].map((number) => ({ id: number, sessionId: 1, exerciseId: 1, exerciseSlug: 'squat', exerciseName: 'Squat', setNumber: number, reps: 8, weight: 20, done: true, loggedAt: '' }))
  model.sets.push({ ...model.sets[0], id: 5, setNumber: 2, intervalIndex: 0 })
  assert.equal(setCount(model, model.plannedExercises[0]), 4)
  assert.equal(nextSet(model, model.plannedExercises[0]), 2)
})
