import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import { ApiClient } from '../../src/client/shared/api/client.js'
import { normalizeProfile, updateProfile } from '../../src/client/profile/api.js'
import { effectiveTrainingGoal, equipmentLabel, goalLabel, goalPrescription, TRAINING_GOALS } from '../../src/client/profile/equipment.js'

test('settings exposes training and equipment without a local identity section', () => {
  const page = readFileSync('src/client/profile/page.ts', 'utf8')
  const app = readFileSync('src/client/app/application.ts', 'utf8')
  assert.match(app, /renderProfilePage\(container\)/)
  assert.match(page, /renderProfilePage\(root: HTMLElement\)/)
  assert.match(page, /list\.append\(trainingSection\(state,.*equipmentSection\(state,/)
  assert.doesNotMatch(page, /profileSection|Display name|Avatar URL/)
  assert.match(page, /renderLoaded\(root, \{ profile, message: '' \}\)/)
})

test('normalizes Profile API payload', () => {
  const profile = normalizeProfile({ displayName: 'Sette', avatarUrl: 'https://example.test/a.png', weightUnit: 'lb', trainingGoal: 'strength', equipment: ['barbell'], heightCm: 180, targetWeightKg: 75 })
  assert.equal(profile.weightUnit, 'lb')
  assert.deepEqual(profile.equipment, ['barbell'])
  assert.equal(profile.heightCm, 180)
  assert.equal(profile.targetWeightKg, 75)
  assert.equal(normalizeProfile({}).trainingGoal, 'general-fitness')
})

test('Profile PATCH sends changed payload', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string, init?: RequestInit }> = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify({ profile: { weightUnit: 'lb', equipment: ['dumbbells'] } }), { status: 200 })
    }
    const profile = await updateProfile({ weightUnit: 'lb' }, new ApiClient())
    assert.equal(profile.weightUnit, 'lb')
    assert.equal(calls[0].url, '/api/profile')
    assert.equal(calls[0].init?.method, 'PATCH')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { weightUnit: 'lb' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('maps equipment and goal labels with fallback', () => {
  assert.equal(equipmentLabel('cable-machine'), 'Cable Machine')
  assert.equal(equipmentLabel('odd-tool'), 'Odd Tool')
  assert.equal(goalLabel('general-fitness'), 'General Fitness')
  assert.equal(goalLabel(''), 'General Fitness')
})

test('documents every Quick Workout goal from the shared prescription source', () => {
  assert.deepEqual(
    TRAINING_GOALS.map(goal => [goal.value, goalPrescription(goal)]),
    [
      ['strength', '4 sets · 3-6 reps · 150 sec rest'],
      ['hypertrophy', '3 sets · 8-12 reps · 90 sec rest'],
      ['general-fitness', '3 sets · 8-15 reps · 75 sec rest'],
      ['endurance', '3 sets · 12-20 reps · 45 sec rest']
    ]
  )
  assert.equal(effectiveTrainingGoal('').value, 'general-fitness')
  assert.ok(TRAINING_GOALS.every(goal => goal.description.length > 30))
  const page = readFileSync('src/client/profile/page.ts', 'utf8')
  assert.match(page, /trainingGoalPicker\(state\.profile\.trainingGoal\)/)
  assert.match(page, /choice\.type = 'radio'/)
  assert.doesNotMatch(page, /Not set/)
})
