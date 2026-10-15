import assert from 'node:assert/strict'
import test from 'node:test'
import { generateQuickWorkout } from '../src/server/quick-workout/generator.js'
import { scoreExercise } from '../src/server/quick-workout/scoring.js'
import { statusForRecovery } from '../src/server/recovery/calculator.js'

function exercise(id, name, muscle, extra = {}) {
  return { id, slug: name.toLowerCase().replaceAll(' ', '-'), name, muscle_group: muscle,
    status: 'active', equipment: [], default_sets: 3, default_reps: '8-12', default_rest: 90, ...extra }
}
function generate(exercises, extra = {}) {
  return generateQuickWorkout({ exercises, recovery: { muscles: [] }, equipment: [],
    recentSessions: [], durationMinutes: 45, goal: 'hypertrophy', targetMuscles: [], ...extra })
}

test('80% threshold excludes tired primary muscles even when their secondary muscles are fresh', () => {
  const plan = generate([
    exercise(1, 'Bench', 'chest', { muscles: ['triceps'] }),
    exercise(2, 'Row', 'back'), exercise(3, 'Curl', 'biceps')
  ], { recovery: { muscles: [{ muscle: 'chest', recovery: .79 }, { muscle: 'back', recovery: .8 }] } })
  assert.deepEqual(new Set(plan.exercises.map(item => item.muscleGroup)), new Set(['back', 'biceps']))
  assert.equal(statusForRecovery(.79), 'moderate')
  assert.equal(statusForRecovery(.8), 'ready')
})

test('canonical groups use the least recovered alias and allow muscles with no recent logs', () => {
  const plan = generate([
    exercise(1, 'Front raise', 'shoulders'), exercise(2, 'Lateral raise', 'lateral deltoid'),
    exercise(3, 'Squat', 'quads'), exercise(4, 'Calf raise', 'calf'),
    exercise(5, 'No metadata', '')
  ], { recovery: { muscles: [
    { muscle: 'anterior-deltoid', recovery: .2 }, { muscle: 'posterior-deltoid', recovery: 1 }
  ] } })
  assert.deepEqual(new Set(plan.exercises.map(item => item.muscleGroup)), new Set(['quadriceps', 'calves']))
  assert.deepEqual(plan.targetMuscles, plan.exercises.map(item => item.muscleGroup))
})

test('round robin reaches other ready groups before taking a second exercise in one group', () => {
  const library = [exercise(1, 'A curl', 'biceps'), exercise(2, 'B curl', 'biceps'),
    exercise(3, 'C curl', 'biceps'), exercise(4, 'D row', 'back'), exercise(5, 'E squat', 'quads')]
  const plan = generate(library, { durationMinutes: 30 })
  assert.equal(plan.exercises.length, 3)
  assert.deepEqual(plan.exercises.map(item => item.muscleGroup), ['biceps', 'back', 'quadriceps'])
  assert.equal(plan.estimatedDurationMinutes, 27)
  assert.deepEqual(plan.pool.biceps.map(item => item.exerciseName), ['B curl', 'C curl'])
  assert.deepEqual(generate([...library].reverse(), { durationMinutes: 30 }), plan)
})

test('compound and completed-before scoring stays within each group, with no preference for unfinished sets', () => {
  const plan = generate([
    exercise(1, 'A new curl', 'biceps'), exercise(2, 'B familiar curl', 'biceps'),
    exercise(3, 'C compound curl', 'biceps', { tags: ['compound'] }),
    exercise(4, 'D familiar compound', 'biceps', { movement_type: 'compound' })
  ], { durationMinutes: 20, recentSessions: [
    { sets: [{ exerciseSlug: 'a-new-curl', done: false }] },
    { sets: [{ exerciseSlug: 'b-familiar-curl', done: true }, { exerciseSlug: 'd-familiar-compound', done: true }] }
  ] })
  assert.deepEqual(plan.exercises.map(item => item.exerciseName), ['D familiar compound', 'B familiar curl'])
  assert.deepEqual(plan.pool.biceps.map(item => item.exerciseName), ['C compound curl', 'A new curl'])
})

test('explicit movement type overrides legacy compound tags', () => {
  const base = { recoveryMap: new Map(), recentSlugs: new Set(), targetMuscles: [] }
  const compound = scoreExercise({ exercise: exercise(1, 'Press', 'chest', { movement_type: 'compound' }), ...base })
  const isolation = scoreExercise({ exercise: exercise(2, 'Fly', 'chest', { movement_type: 'isolation', tags: ['compound'] }), ...base })
  const legacy = scoreExercise({ exercise: exercise(3, 'Dip', 'chest', { tags: ['compound'] }), ...base })
  assert.equal(compound.score, 1)
  assert.equal(isolation.score, 0)
  assert.equal(legacy.score, 1)
})

test('unavailable equipment and inactive exercises never appear in the plan or swap pool', () => {
  const plan = generate([
    exercise(1, 'Bodyweight squat', 'legs', { equipment: ['bodyweight'] }),
    exercise(2, 'Barbell squat', 'legs', { equipment: ['barbell'] }),
    exercise(3, 'Archived squat', 'legs', { status: 'archived' })
  ], { equipment: ['dumbbells'] })
  assert.deepEqual(plan.exercises.map(item => item.exerciseId), [1])
  assert.deepEqual(plan.pool.quadriceps, [])
})
