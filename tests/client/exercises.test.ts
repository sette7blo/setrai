import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import { ApiClient } from '../../src/client/shared/api/client.js'
import { deleteExercise, setExerciseFavourite } from '../../src/client/exercises/api.js'
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
import { imageFallbackState, localExerciseImageUrl } from '../../src/client/exercises/image.js'
import { applyExerciseImage, MAX_EXERCISE_IMAGE_BYTES } from '../../src/client/exercises/image-upload.js'
import { muscleMapMarkup, muscleMapMarkupForMuscles, muscleRegion } from '../../src/client/exercises/muscle-map.js'
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
    movementType: 'compound',
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

test('uploaded images attach immediately when editing an existing exercise', async () => {
  const updates: Array<{ id: number, imageUrl: string }> = []
  const uploaded = await applyExerciseImage({ size: 1024 } as File, 217, {
    upload: async () => '/media/exercises/sit-up.jpg',
    update: async (id, payload) => {
      updates.push({ id, imageUrl: payload.imageUrl })
      return exercise({ id, imageUrl: payload.imageUrl })
    }
  })

  assert.deepEqual(uploaded, {
    imageUrl: '/media/exercises/sit-up.jpg',
    persisted: true
  })
  assert.deepEqual(updates, [{ id: 217, imageUrl: '/media/exercises/sit-up.jpg' }])
})

test('new-exercise images wait for creation and oversized photos fail clearly', async () => {
  const uploaded = await applyExerciseImage({ size: 1024 } as File, null, {
    upload: async () => '/media/exercises/new.jpg'
  })
  assert.deepEqual(uploaded, {
    imageUrl: '/media/exercises/new.jpg',
    persisted: false
  })
  await assert.rejects(
    applyExerciseImage({ size: MAX_EXERCISE_IMAGE_BYTES + 1 } as File, null),
    /10 MB or smaller/
  )
})

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

test('remote and malformed exercise images stay local fallbacks', () => {
  for (const imageUrl of ['https://example.test/a.png', '//example.test/a.png',
    '/images/../outside.png', '/images/%2e%2e/outside.png', '/images/a.png?redirect=external']) {
    assert.equal(localExerciseImageUrl(imageUrl), '')
    assert.equal(imageFallbackState(imageUrl, false), 'fallback')
    assert.equal(normalizeExercise({ id: 1, slug: 'local', name: 'Local', image_url: imageUrl }).imageUrl, '')
  }
  assert.equal(localExerciseImageUrl('/media/exercises/upload.png'), '/media/exercises/upload.png')
  const detail = readFileSync('src/client/exercises/detail-view.ts', 'utf8')
  assert.doesNotMatch(detail, /actionLabel|Download|Catalog import/)
})

test('normalizes expected API payload into safe client fields', () => {
  const normalized = normalizeExercise({
    id: 7,
    slug: 'bench-press',
    name: 'Bench Press',
    muscle_group: 'chest',
    movement_type: 'compound',
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
  assert.equal(normalized.movementType, 'compound')
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

test('delete API contract sends DELETE exercise request', async () => {
  const calls: Array<{ url: string, init?: RequestInit }> = []
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(null, { status: 204 })
    }

    await deleteExercise(9, new ApiClient())
    assert.equal(calls[0].url, '/api/exercises/9')
    assert.equal(calls[0].init?.method, 'DELETE')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('muscle map highlights primary chest and secondary triceps and granular deltoid', () => {
  const markup = muscleMapMarkup({ muscleGroup: 'chest', muscles: ['triceps', 'anterior-deltoid'] })
  assert.match(markup, /data-muscle="Chest"[^>]*class="muscle-map__primary"/)
  assert.match(markup, /data-muscle="Triceps"[^>]*class="muscle-map__secondary"/)
  assert.match(markup, /data-muscle="Shoulders"[^>]*class="muscle-map__secondary"/)
  assert.match(markup, /data-muscle="Calves"[^>]*class="muscle-map__inactive"/)
})

test('theme preserves distinct primary and secondary muscle map colors', () => {
  const theme = readFileSync('src/client/app/styles/editorial.css', 'utf8')
  const styles = readFileSync('src/client/exercises/styles.css', 'utf8')
  assert.match(theme, /\.muscle-map__primary\s*\{\s*fill: #000 !important;/)
  assert.match(theme, /\.muscle-map__secondary\s*\{\s*fill: var\(--color-warning\) !important;/)
  assert.doesNotMatch(theme, /\.muscle-map__primary\s*,\s*\.muscle-map__secondary\s*\{/)
  assert.match(styles, /\.muscle-map__key-secondary\s*\{\s*color: var\(--color-warning\);/)
})

test('primary highlighting takes precedence and unknown muscles stay unpainted', () => {
  const markup = muscleMapMarkup({ muscleGroup: 'chest', muscles: ['chest', '<script>'] })
  assert.match(markup, /data-muscle="Chest"[^>]*class="muscle-map__primary"/)
  assert.equal(markup.includes('<script>'), false)
  assert.equal(muscleRegion('Anterior Deltoid'), 'Shoulders')
  assert.equal(muscleRegion('abdominals'), 'Core')
  assert.equal(muscleRegion('full-body'), 'Core')
  assert.equal(muscleRegion('abductors'), 'Glutes')
  assert.equal(muscleRegion('adductors'), 'Quadriceps')
  assert.equal(muscleRegion('unknown'), undefined)
})

test('aggregate muscle map highlights multiple primary regions for workout history', () => {
  const markup = muscleMapMarkupForMuscles(['chest', 'back'], ['triceps', 'biceps', 'chest'])
  assert.match(markup, /data-muscle="Chest"[^>]*class="muscle-map__primary"/)
  assert.match(markup, /data-muscle="Back"[^>]*class="muscle-map__primary"/)
  assert.match(markup, /data-muscle="Triceps"[^>]*class="muscle-map__secondary"/)
  assert.match(markup, /data-muscle="Biceps"[^>]*class="muscle-map__secondary"/)
})

test('exercise detail and editor do not present workout prescriptions', () => {
  const detail = readFileSync('src/client/exercises/detail-view.ts', 'utf8')
  const editor = readFileSync('src/client/exercises/editor-page.ts', 'utf8')
  const styles = readFileSync('src/client/exercises/styles.css', 'utf8')
  assert.doesNotMatch(detail, /detail-prescription|['"]Sets['"]|['"]Reps['"]|['"]Rest['"]/)
  assert.doesNotMatch(editor, /formSection\(['"]Prescription|Rest \(sec\)/)
  assert.doesNotMatch(styles, /detail-prescription|field-grid--prescription/)
})

test('detail normalization preserves all instruction steps', () => {
  const steps = ['Plant your feet.', 'Lower under control.', 'Press upward.']
  assert.deepEqual(normalizeExercise({ id: 1, slug: 'bench-press', name: 'Bench Press', instructions: steps }).instructions, steps)
})
