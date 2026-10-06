import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiClient } from '../../src/client/shared/api/client.js'
import { normalizeProfile, updateProfile } from '../../src/client/profile/api.js'
import { equipmentLabel, goalLabel } from '../../src/client/profile/equipment.js'

test('normalizes Profile API payload', () => {
  const profile = normalizeProfile({ displayName: 'Sette', avatarUrl: 'https://example.test/a.png', weightUnit: 'lb', trainingGoal: 'strength', equipment: ['barbell'] })
  assert.equal(profile.weightUnit, 'lb')
  assert.deepEqual(profile.equipment, ['barbell'])
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
  assert.equal(goalLabel(''), 'Not set')
})
