import assert from 'node:assert/strict'
import test from 'node:test'
import { menuDestination } from '../../src/client/app/menu-navigation.js'
import { DESKTOP_NAVIGATION_ITEMS, NAVIGATION_ITEMS } from '../../src/client/app/navigation.js'
import { primaryNavPath } from '../../src/client/app/router.js'

test('desktop Settings uses the profile route while mobile retains its header gear', () => {
  const settings = DESKTOP_NAVIGATION_ITEMS.find(item => item.label === 'Settings')
  assert.equal(settings?.path, '/profile')
  assert.ok(settings?.icon)
  assert.equal(primaryNavPath('/profile'), settings?.path)
  assert.equal(menuDestination(settings!.path, 'http://localhost:3191/exercises')?.pathname, '/profile')
  assert.deepEqual(NAVIGATION_ITEMS.map(item => item.path), ['/statistics', '/exercises', '/workouts'])
})

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
