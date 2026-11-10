import assert from 'node:assert/strict'
import test from 'node:test'

import { primaryNavPath } from '../../src/client/app/router.js'
import {
  parseCapabilities
} from '../../src/client/app/capabilities.js'
import { NAVIGATION_ITEMS } from '../../src/client/app/navigation.js'

test('capabilities parsing keeps missing or malformed integrations disabled', () => {
  assert.deepEqual(
    parseCapabilities({ ai: true }),
    {
      ai: true
    }
  )

  assert.deepEqual(
    parseCapabilities(null),
    {
      ai: false
    }
  )
})

test('every route belongs to Today, Progress, or Library', () => {
  assert.equal(primaryNavPath('/'), '/today')
  assert.equal(primaryNavPath('/today'), '/today')
  assert.equal(primaryNavPath('/recovery'), '/today')
  assert.equal(primaryNavPath('/quick-workout'), '/today')
  assert.equal(primaryNavPath('/statistics/recovery'), '/today')
  assert.equal(primaryNavPath('/statistics'), '/statistics')
  assert.equal(primaryNavPath('/statistics/body'), '/statistics')
  assert.equal(primaryNavPath('/statistics/history'), '/statistics')
  assert.equal(primaryNavPath('/library/exercises'), '/library/exercises')
  assert.equal(primaryNavPath('/library/programs'), '/library/exercises')
  assert.equal(primaryNavPath('/exercises/7'), '/library/exercises')
  assert.equal(primaryNavPath('/profile'), '/profile')
})

test('primary navigation holds destinations only, with no workout action tab', () => {
  assert.deepEqual(
    NAVIGATION_ITEMS.map(item => [item.label, item.path]),
    [['Today', '/today'], ['Progress', '/statistics'], ['Library', '/library/exercises']]
  )
  assert.equal(NAVIGATION_ITEMS.some(item => /quick|resume|session/i.test(`${item.label}${item.path}`)), false)
})
