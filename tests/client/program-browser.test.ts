import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiClient } from '../../src/client/shared/api/client.js'
import { normalizeExercise } from '../../src/client/exercises/format.js'
import { normalizeProgram, normalizeProgramExercise } from '../../src/client/workouts/format.js'
import { emptyProgramFilters, estimateProgramSeconds, matchesProgram, programMuscleLabels, programTaxonomy } from '../../src/client/workouts/program-taxonomy.js'
import { builderEntry, builderEntries, buildProgramInput } from '../../src/client/workouts/builder-plan.js'
import { loadProgramCatalog, importCatalogProgram } from '../../src/client/workouts/discovery-api.js'
import { saveProgram, duplicateProgram, deleteProgram } from '../../src/client/workouts/api.js'

const squat = normalizeExercise({ id: 1, slug: 'squat', name: 'Squat', muscleGroup: 'quadriceps', equipment: ['barbell'] })
const press = normalizeExercise({ id: 2, slug: 'press', name: 'Press', muscleGroup: 'chest', equipment: ['dumbbells'] })
function program() {
  const result = normalizeProgram({ id: 1, slug: 'full-body', name: 'Full Body', difficulty: 'beginner', tags: ['strength'], exercises: [
    { exerciseId: 1, exerciseSlug: 'squat', sets: 3, reps: '8', restSeconds: 90 },
    { exerciseId: 2, exerciseSlug: 'press', sets: 3, reps: '10', restSeconds: 60 }
  ] })
  result.exercises[0].exercise = squat
  result.exercises[1].exercise = press
  return result
}

test('Workstr program facets keep goal, focus, format, level and equipment independent', () => {
  const item = program()
  assert.deepEqual(programTaxonomy(item), {
    goals: ['strength'], focus: ['full-body', 'push', 'legs'], format: ['normal'], level: 'beginner', equipment: ['barbell', 'dumbbells']
  })
  const filters = { ...emptyProgramFilters(), goal: 'strength', focus: 'full-body', level: 'beginner', equipment: 'barbell' }
  assert.equal(matchesProgram(item, filters), true)
  assert.equal(matchesProgram(item, { ...filters, goal: 'endurance' }), false)
  assert.equal(matchesProgram(item, { ...filters, format: 'emom' }), false)
  assert.equal(matchesProgram(item, { ...emptyProgramFilters(), equipment: 'my-equipment' }, ['barbell']), false)
  assert.equal(matchesProgram(item, { ...emptyProgramFilters(), equipment: 'my-equipment' }, ['barbell', 'dumbbells']), true)
  assert.equal(matchesProgram(item, { ...emptyProgramFilters(), search: ' Full BODY ' }), true)
  assert.equal(estimateProgramSeconds(item), 570)
})

test('Upper workout matches Workstr duration and displays names and Arms without changing anatomy', () => {
  const upper = normalizeProgram({ id: 2, slug: 'upper', name: 'Upper', exercises: [
    { exerciseSlug: 'alternate-hammer-curl', exerciseName: '', sets: 3, reps: '8-12', restSeconds: 90 },
    { exerciseSlug: 'alternating-renegade-row', exerciseName: '', sets: 3, reps: '8-12', restSeconds: 90 },
    { exerciseSlug: 'ankle-circles', exerciseName: '', sets: 3, reps: '8-12', restSeconds: 90 }
  ] })
  assert.deepEqual(upper.exercises.map(entry => entry.exerciseName), ['Alternate Hammer Curl', 'Alternating Renegade Row', 'Ankle Circles'])
  upper.exercises.forEach((entry, index) => { entry.exercise = normalizeExercise({ id: index + 1, slug: entry.exerciseSlug, name: entry.exerciseName, muscleGroup: ['biceps', 'back', 'calves'][index] }) })
  assert.equal(estimateProgramSeconds(upper), 945)
  assert.equal(Math.round(estimateProgramSeconds(upper) / 60), 16)
  assert.deepEqual(programMuscleLabels(upper), ['Arms', 'Back', 'Calves'])
  assert.equal(upper.exercises[0].exercise?.muscleGroup, 'biceps')
  assert.equal(normalizeProgramExercise({ exerciseName: ' ', exercise_slug: 'hammer-curl' }).exerciseName, 'Hammer Curl')
  assert.equal(normalizeProgramExercise({}).exerciseName, 'Exercise')
  assert.equal(estimateProgramSeconds({ ...upper, exercises: [{ ...upper.exercises[0], sets: 1, restSec: 0 }] }), 45)
  const mixed = { ...upper, exercises: [upper.exercises[0]], blocks: [
    { type: 'emom' as const, rounds: 2, totalDurationSec: 120, intervals: [{ durationSec: 60, steps: [{ exerciseSlug: upper.exercises[0].exerciseSlug }] }] },
    { type: 'straight' as const, rounds: 3, steps: [{ exerciseSlug: upper.exercises[0].exerciseSlug }] }
  ] }
  assert.equal(estimateProgramSeconds(mixed), 435)
})

test('builder uses exercise defaults, saves reordered prescriptions and validates empty plans', () => {
  const first = builderEntry(squat, 0)
  const second = builderEntry(press, 1)
  first.sets = 5
  first.reps = '5'
  first.weight = 75
  const input = buildProgramInput(' My workout ', ' Details ', 'advanced', ['strength'], [second, first])
  assert.equal(input.name, 'My workout')
  assert.equal(input.description, 'Details')
  assert.deepEqual(input.exercises.map(entry => entry.exerciseId), [2, 1])
  assert.equal(input.exercises[1].position, 1)
  assert.equal(input.exercises[1].targetWeight, 75)
  assert.throws(() => buildProgramInput('', '', '', [], [first]), /name/)
  assert.throws(() => buildProgramInput('Empty', '', '', [], []), /exercise/)
  assert.throws(() => buildProgramInput('Invalid', '', '', [], [{ ...first, sets: 0 }]), /Sets/)
})

test('builder keeps multi-section EMOM timings and supersets', () => {
  const first = { ...builderEntry(squat, 0), section: 1, restSec: 60, workSec: 30 }
  const second = { ...builderEntry(press, 1), section: 2, restSec: 45, workSec: 20 }
  const input = buildProgramInput('Timed', '', '', [], [first, second])
  assert.equal(input.blocks?.length, 2)
  assert.equal(input.blocks?.[0].totalDurationSec, 180)
  const imported = normalizeProgram({ ...input, id: 1, slug: 'timed' })
  const rows = builderEntries(imported)
  assert.equal(rows[1].section, 2)
  assert.equal(rows[1].workSec, 20)
  assert.equal(estimateProgramSeconds(imported), 315)
  const superset = buildProgramInput('Pair', '', '', [], [{ ...first, section: 0, workSec: 0, superset: '1' }, { ...second, section: 0, workSec: 0, superset: '1' }])
  assert.equal(superset.blocks?.[0].type, 'straight')
  assert.equal(superset.blocks?.[0].steps?.length, 2)
  assert.throws(() => buildProgramInput('Invalid', '', '', [], [{ ...first, workSec: 90 }]), /interval/)
  const circuit = buildProgramInput('Circuit', '', '', [], [{ ...first, interval: 1 }, { ...second, section: 1, interval: 1, restSec: 60 }])
  assert.equal(circuit.blocks?.[0].intervals?.length, 1)
  assert.equal(circuit.blocks?.[0].intervals?.[0].steps.length, 2)
  const circuitProgram = normalizeProgram({ ...circuit, id: 1, slug: 'circuit' })
  const circuitRows = builderEntries(circuitProgram)
  const edited = buildProgramInput('Edited circuit', '', '', [], circuitRows)
  assert.equal(edited.blocks?.[0].intervals?.length, 1)
  assert.equal(edited.blocks?.[0].totalDurationSec, 180)
})

test('workout API mutations and discovery use server contracts and preserve metadata', async () => {
  const original = globalThis.fetch
  const requests: { path: string; method: string; body: unknown }[] = []
  globalThis.fetch = (async (input, options) => {
    const path = String(input)
    requests.push({ path, method: options?.method ?? 'GET', body: options?.body ? JSON.parse(String(options.body)) : undefined })
    if (options?.method === 'DELETE') return new Response(null, { status: 204 })
    if (path.includes('/nostr/programs?')) return Response.json({ fetchedAt: 100, unavailableRelays: 0, programs: [{
      slug: 'test', name: 'Remote', description: '', difficulty: 'beginner', tags: ['strength'], blocks: [],
      eventId: 'e'.repeat(64), address: '33402:author:workstr:program:test', pubkey: 'author', sourceLabel: 'Workstr', muscleMapUrl: '', localId: null,
      exercises: [{ address: 'workstr:exercise:squat', name: 'Squat', muscleGroup: 'quadriceps', muscles: ['quadriceps'], equipment: ['barbell'], imageUrl: '', sets: 3, reps: '8', restSec: 90, weight: null, notes: '' }]
    }] })
    return Response.json({ program: { id: 7, slug: 'test', name: 'Saved', exercises: [], blocks: [], nostrAddress: 'remote' } })
  }) as typeof fetch
  try {
    const client = new ApiClient('http://localhost')
    const input = buildProgramInput('Test', '', '', [], [builderEntry(squat, 0)])
    await saveProgram(input, undefined, client)
    await saveProgram(input, 7, client)
    await duplicateProgram(7, client)
    await deleteProgram(7, client)
    const catalog = await loadProgramCatalog(true, client)
    assert.equal(catalog.programs[0].exercises[0].exercise?.muscleGroup, 'quadriceps')
    assert.equal(catalog.programs[0].nostrEventId, 'e'.repeat(64))
    assert.equal((await importCatalogProgram('e'.repeat(64), client)).id, 7)
    assert.deepEqual(requests.map(request => request.method), ['POST', 'PATCH', 'POST', 'DELETE', 'GET', 'POST'])
    assert.match(requests[4].path, /refresh=true$/)
    assert.deepEqual(requests[5].body, { eventId: 'e'.repeat(64) })
  } finally { globalThis.fetch = original }
})
