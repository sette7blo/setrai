import assert from 'node:assert/strict'
import test from 'node:test'
import { menuDestination } from '../../src/client/app/menu-navigation.js'

const current = 'http://localhost:3191/exercises'
test('same-origin menu destinations support navigation without reloading', () => {
  assert.equal(menuDestination('/workouts', current)?.pathname, '/workouts')
  assert.equal(menuDestination('/', current)?.pathname, '/')
  assert.equal(menuDestination('/statistics?range=week', current)?.search, '?range=week')
})
test('external, hash, download and new-tab links keep native browser behavior', () => {
  assert.equal(menuDestination('https://example.com/', current), null)
  assert.equal(menuDestination('#results', current), null)
  assert.equal(menuDestination('/profile', current, '_blank'), null)
  assert.equal(menuDestination('/profile', current, '', true), null)
})
test('live session navigation preserves timer teardown through document navigation', () => {
  assert.equal(menuDestination('/sessions/1', current), null)
  assert.equal(menuDestination('/workouts', 'http://localhost:3191/sessions/1'), null)
})
