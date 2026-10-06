import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiClient } from '../../src/client/shared/api/client.js'
import { setExerciseFavourite } from '../../src/client/exercises/api.js'
import {
  filterExercises,
  filtersToUrl,
  uniqueEquipment,
  uniqueMuscles
} from '../../src/client/exercises/filters.js'
import {
  displayName,
  normalizeExercise,
  pluralizeExercise
} from '../../src/client/exercises/format.js'
import { imageFallbackState } from '../../src/client/exercises/image.js'
import type { Exercise } from '../../src/client/exercises/types.js'

function exercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 1,
    slug: 'bench-press',
    name: 'Bench Press',
    description: '',
    category: 'strength',
    muscleGroup: 'chest',
    muscles: ['chest', 'triceps'],
    equipment: ['barbell', 'bench'],
    difficulty: 'intermediate',
    tags: [],
    instructions: [],
    imageUrl: '/images/exercises/bench-press.webp',
    favourite: false,
    defaultSets: 3,
    defaultReps: '6-10',
    defaultRest: 120,
    ...overrides
  }
}

const library = [
  exercise({
    id: 1,
    name: 'Bench Press',
    muscleGroup: 'chest',
    equipment: ['barbell', 'bench'],
    favourite: true
  }),
  exercise({
    id: 2,
    slug: 'dumbbell-row',
    name: 'Dumbbell Row',
    muscleGroup: 'back',
    equipment: ['dumbbells'],
    favourite: false
  }),
  exercise({
    id: 3,
    slug: 'dumbbell-chest-press',
    name: 'Dumbbell Chest Press',
    muscleGroup: 'chest',
    equipment: ['dumbbells', 'bench'],
    favourite: true
  })
]

test('filters favorites only', () => {
  const results = filterExercises(library, {
    search: '',
    favouritesOnly: true,
    muscle: '',
    equipment: '',
    difficulty: ''
  })

  assert.deepEqual(results.map((item) => item.name), [
    'Bench Press',
    'Dumbbell Chest Press'
  ])
})

test('searches by exercise name, primary muscle, and equipment', () => {
  assert.deepEqual(
    filterExercises(library, {
      search: 'row',
      favouritesOnly: false,
      muscle: '',
      equipment: '',
      difficulty: ''
    }).map((item) => item.name),
    ['Dumbbell Row']
  )

  assert.equal(filterExercises(library, {
    search: 'chest',
    favouritesOnly: false,
    muscle: '',
    equipment: '',
    difficulty: ''
  }).length, 2)

  assert.equal(filterExercises(library, {
    search: 'dumbbells',
    favouritesOnly: false,
    muscle: '',
    equipment: '',
    difficulty: ''
  }).length, 2)
})

test('combines muscle and equipment filters predictably', () => {
  const results = filterExercises(library, {
    search: '',
    favouritesOnly: true,
    muscle: 'chest',
    equipment: 'dumbbells',
    difficulty: ''
  })

  assert.deepEqual(results.map((item) => item.name), ['Dumbbell Chest Press'])
})

test('derives canonical muscle and equipment options from exercise data', () => {
  assert.deepEqual(uniqueMuscles(library), ['back', 'chest'])
  assert.deepEqual(uniqueEquipment(library), ['barbell', 'bench', 'dumbbells'])
})

test('formats canonical equipment values for display', () => {
  assert.equal(displayName('cable-machine'), 'Cable Machine')
  assert.equal(displayName('pull_up_bar'), 'Pull Up Bar')
})

test('encodes result-affecting filters into URL parameters', () => {
  const params = filtersToUrl({
    search: 'press',
    favouritesOnly: true,
    muscle: 'chest',
    equipment: 'dumbbells',
    difficulty: ''
  })

  assert.equal(params.toString(), 'search=press&favourite=true&muscle=chest&equipment=dumbbells')
})

test('formats exercise result counts', () => {
  assert.equal(pluralizeExercise(1), '1 exercise')
  assert.equal(pluralizeExercise(12), '12 exercises')
})

test('reports image fallback state without external placeholder URLs', () => {
  assert.equal(imageFallbackState('/images/exercises/bench-press.webp', false), 'image')
  assert.equal(imageFallbackState('/images/exercises/missing.webp', true), 'fallback')
  assert.equal(imageFallbackState('', false), 'fallback')
})

test('normalizes expected API payload into safe client fields', () => {
  const normalized = normalizeExercise({
    id: 7,
    slug: 'bench-press',
    name: 'Bench Press',
    muscle_group: 'chest',
    image_url: '/images/exercises/bench-press.webp',
    default_sets: 3,
    default_reps: '6-10',
    default_rest: 120,
    muscles: ['chest'],
    equipment: ['barbell'],
    instructions: ['Lower the bar'],
    favourite: true
  })

  assert.equal(normalized.muscleGroup, 'chest')
  assert.equal(normalized.imageUrl, '/images/exercises/bench-press.webp')
  assert.equal(normalized.defaultSets, 3)
  assert.equal(normalized.defaultReps, '6-10')
  assert.equal(normalized.defaultRest, 120)
  assert.equal('muscle_group' in normalized, false)
})

test('favorite API contract sends PATCH favourite payload', async () => {
  const calls: Array<{ url: string, init?: RequestInit }> = []
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify({
        exercise: {
          id: 1,
          slug: 'bench-press',
          name: 'Bench Press',
          muscle_group: 'chest',
          favourite: true
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const updated = await setExerciseFavourite(1, true, new ApiClient())
    assert.equal(updated.favourite, true)
    assert.equal(calls[0].url, '/api/exercises/1')
    assert.equal(calls[0].init?.method, 'PATCH')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { favourite: true })
  } finally {
    globalThis.fetch = originalFetch
  }
})
