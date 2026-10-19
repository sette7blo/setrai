import assert from 'node:assert/strict'
import test from 'node:test'

import {
  capabilityLabel,
  findRoute,
  primaryNavPath
} from '../../src/client/app/router.js'
import {
  parseCapabilities
} from '../../src/client/app/capabilities.js'
import { mobileNavigationItems } from '../../src/client/app/navigation.js'

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

test('capability label avoids disabled integration placeholders', () => {
  assert.equal(
    capabilityLabel({ ai: false }),
    'Self-hosted training mode'
  )

  assert.equal(
    capabilityLabel({ ai: true }),
    'Training plus ai'
  )
})

test('route lookup falls back to the Setrai home route', () => {
  assert.equal(findRoute('/profile').title, 'Settings')
  assert.equal(findRoute('/unknown').path, '/')
  assert.equal(findRoute('/statistics/body').title, 'Home')
  assert.equal(findRoute('/statistics/body').primaryAction, 'Log body weight')
})

test('home body route stays under Home primary navigation', () => {
  assert.equal(primaryNavPath('/statistics'), '/statistics')
  assert.equal(primaryNavPath('/statistics/body'), '/statistics')
  assert.equal(primaryNavPath('/statistics/training'), '/statistics')
  assert.equal(primaryNavPath('/'), '/statistics')
})

test('mobile navigation exposes recovery-aware Quick and active-session Resume actions', () => {
  assert.deepEqual(
    mobileNavigationItems().map(item => [item.label, item.path]),
    [['Home', '/statistics'], ['Exercises', '/exercises'], ['Quick', '/quick-workout'], ['Workouts', '/workouts']]
  )
  assert.deepEqual(
    mobileNavigationItems(42).map(item => [item.label, item.path]),
    [['Home', '/statistics'], ['Exercises', '/exercises'], ['Resume', '/sessions/42'], ['Workouts', '/workouts']]
  )
})
